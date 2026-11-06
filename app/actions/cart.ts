"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { MAX_QTY_PER_LINE, clampQuantity, evaluateCoupon } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";
import { findCartId, getCartView, getOrCreateCartId, lookupCoupon } from "@/services/cart";
import { rateLimited } from "@/services/rate-limit";

export type CartActionState = { ok: boolean; message?: string };

const id = z.string().min(1).max(40);

/** Refresh the cart page, header badge and anything else showing cart data. */
function refresh() {
  revalidatePath("/", "layout");
}

export async function addToCart(
  variantId: string,
  quantity: number,
  options?: { buyNow?: boolean },
): Promise<CartActionState> {
  const parsedId = id.safeParse(variantId);
  if (!parsedId.success) return { ok: false, message: "Invalid product." };
  const limited = await rateLimited("cartAdd");
  if (limited) return { ok: false, message: limited };
  const qty = clampQuantity(quantity);

  const variant = await prisma.productVariant.findFirst({
    where: { id: parsedId.data, isActive: true, product: { isActive: true } },
    include: { inventory: true },
  });
  if (!variant) return { ok: false, message: "This item is no longer available." };
  const available = variant.inventory ? variant.inventory.quantity - variant.inventory.reserved : 0;
  if (available <= 0) return { ok: false, message: "Sorry, this item is out of stock." };

  const cartId = await getOrCreateCartId();
  const existing = await prisma.cartItem.findUnique({
    where: { cartId_variantId: { cartId, variantId: variant.id } },
  });
  const wanted = Math.min(MAX_QTY_PER_LINE, (existing?.quantity ?? 0) + qty);
  const final = Math.min(wanted, available);

  await prisma.cartItem.upsert({
    where: { cartId_variantId: { cartId, variantId: variant.id } },
    update: { quantity: final },
    create: { cartId, variantId: variant.id, quantity: final },
  });
  refresh();

  if (options?.buyNow) redirect("/checkout");
  return {
    ok: true,
    message:
      final < wanted
        ? `Added – only ${available} available, so your cart is capped at ${final}.`
        : "Added to your cart.",
  };
}

export async function updateQuantity(itemId: string, quantity: number): Promise<void> {
  const parsed = id.safeParse(itemId);
  const cartId = await findCartId();
  if (!parsed.success || !cartId) return;
  if (quantity <= 0) return removeItem(itemId);
  // cartId in the WHERE clause = users can only touch their own cart's lines
  await prisma.cartItem.updateMany({
    where: { id: parsed.data, cartId },
    data: { quantity: clampQuantity(quantity) },
  });
  refresh();
}

export async function removeItem(itemId: string): Promise<void> {
  const parsed = id.safeParse(itemId);
  const cartId = await findCartId();
  if (!parsed.success || !cartId) return;
  await prisma.cartItem.deleteMany({ where: { id: parsed.data, cartId } });
  refresh();
}

export async function applyCoupon(_prev: CartActionState, fd: FormData): Promise<CartActionState> {
  const limited = await rateLimited("coupon"); // stops guessing coupon codes
  if (limited) return { ok: false, message: limited };
  const code = String(fd.get("code") ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9_-]{2,30}$/.test(code)) return { ok: false, message: "Enter a valid coupon code." };

  const cart = await getCartView();
  if (!cart.cartId || cart.lines.length === 0) return { ok: false, message: "Your cart is empty." };

  const result = evaluateCoupon(await lookupCoupon(code), cart.totals.subtotalPaise, new Date());
  if (!result.ok) return { ok: false, message: result.reason };

  await prisma.cart.update({ where: { id: cart.cartId }, data: { couponCode: code } });
  refresh();
  return { ok: true, message: `Coupon ${code} applied.` };
}

export async function removeCoupon(): Promise<void> {
  const cartId = await findCartId();
  if (!cartId) return;
  await prisma.cart.update({ where: { id: cartId }, data: { couponCode: null } });
  refresh();
}

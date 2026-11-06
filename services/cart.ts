import "server-only";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { MAX_QTY_PER_LINE, computeTotals, evaluateCoupon, type CouponRule, type Totals } from "@/lib/pricing";

export const CART_COOKIE = "cart_token";
const CART_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export function newGuestToken() {
  return randomBytes(24).toString("hex");
}

export async function setCartCookie(token: string) {
  (await cookies()).set(CART_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CART_COOKIE_MAX_AGE,
  });
}

/** Finds the visitor's cart without creating one. Signed-in users own a cart by profile; guests by cookie token. */
export async function findCartId(): Promise<string | null> {
  const user = await getSessionUser();
  if (user) {
    const cart = await prisma.cart.findUnique({ where: { profileId: user.id }, select: { id: true } });
    return cart?.id ?? null;
  }
  const token = (await cookies()).get(CART_COOKIE)?.value;
  if (!token) return null;
  const cart = await prisma.cart.findUnique({ where: { guestToken: token }, select: { id: true } });
  return cart?.id ?? null;
}

/** Server Actions only (it may set a cookie). */
export async function getOrCreateCartId(): Promise<string> {
  const existing = await findCartId();
  if (existing) return existing;
  const user = await getSessionUser();
  if (user) {
    // upsert: two concurrent first-adds must not collide on the unique profileId
    const cart = await prisma.cart.upsert({
      where: { profileId: user.id },
      update: {},
      create: { profileId: user.id },
      select: { id: true },
    });
    return cart.id;
  }
  const token = newGuestToken();
  const cart = await prisma.cart.create({ data: { guestToken: token }, select: { id: true } });
  await setCartCookie(token);
  return cart.id;
}

export type CartLine = {
  itemId: string;
  variantId: string;
  productName: string;
  slug: string;
  variantLabel: string;
  sku: string;
  unitPricePaise: number;
  quantity: number;
  lineTotalPaise: number;
  imageUrl: string | null;
  imageAlt: string | null;
  /** units that can still be bought */
  available: number;
  /** false if the product/variant was deactivated */
  purchasable: boolean;
  /** quantity cannot be fulfilled right now */
  problem: string | null;
};

export type CartView = {
  cartId: string | null;
  lines: CartLine[];
  itemCount: number;
  totals: Totals;
  coupon: { code: string; ok: boolean; reason?: string; discountPaise: number } | null;
  /** true when every line can be ordered */
  canCheckout: boolean;
};

const EMPTY: CartView = {
  cartId: null,
  lines: [],
  itemCount: 0,
  totals: computeTotals([]),
  coupon: null,
  canCheckout: false,
};

export async function lookupCoupon(code: string): Promise<CouponRule | null> {
  const c = await prisma.coupon.findUnique({ where: { code: code.trim().toUpperCase() } });
  return c ? { ...c } : null;
}

/** Priced, availability-checked view of the cart. `now` is a parameter-free Date read at request time. */
export async function getCartView(): Promise<CartView> {
  const cartId = await findCartId();
  if (!cartId) return EMPTY;

  const cart = await prisma.cart.findUnique({
    where: { id: cartId },
    include: {
      items: {
        orderBy: { createdAt: "asc" },
        include: {
          variant: {
            include: {
              inventory: true,
              product: { select: { name: true, slug: true, isActive: true, images: { orderBy: { sortOrder: "asc" }, take: 1 } } },
            },
          },
        },
      },
    },
  });
  if (!cart) return EMPTY;

  const lines: CartLine[] = cart.items.map((i) => {
    const v = i.variant;
    const available = v.inventory ? Math.max(0, v.inventory.quantity - v.inventory.reserved) : 0;
    const purchasable = v.isActive && v.product.isActive;
    let problem: string | null = null;
    if (!purchasable) problem = "No longer available";
    else if (available === 0) problem = "Out of stock";
    else if (i.quantity > available) problem = `Only ${available} left`;
    return {
      itemId: i.id,
      variantId: v.id,
      productName: v.product.name,
      slug: v.product.slug,
      variantLabel: v.label,
      sku: v.sku,
      unitPricePaise: v.priceInPaise,
      quantity: i.quantity,
      lineTotalPaise: v.priceInPaise * i.quantity,
      imageUrl: v.product.images[0]?.url ?? null,
      imageAlt: v.product.images[0]?.alt ?? null,
      available,
      purchasable,
      problem,
    };
  });

  const subtotal = lines.reduce((s, l) => s + l.lineTotalPaise, 0);
  let coupon: CartView["coupon"] = null;
  let discount = 0;
  if (cart.couponCode) {
    const result = evaluateCoupon(await lookupCoupon(cart.couponCode), subtotal, new Date());
    if (result.ok) discount = result.discountPaise;
    coupon = {
      code: cart.couponCode,
      ok: result.ok,
      reason: result.ok ? undefined : result.reason,
      discountPaise: discount,
    };
  }

  return {
    cartId,
    lines,
    itemCount: lines.reduce((s, l) => s + l.quantity, 0),
    totals: computeTotals(lines, discount),
    coupon,
    canCheckout: lines.length > 0 && lines.every((l) => !l.problem),
  };
}

/** Cheap count for the header badge. */
export async function getCartCount(): Promise<number> {
  const cartId = await findCartId();
  if (!cartId) return 0;
  const agg = await prisma.cartItem.aggregate({ where: { cartId }, _sum: { quantity: true } });
  return agg._sum.quantity ?? 0;
}

/**
 * After sign-in, fold the guest cart into the user's cart. Quantities add up
 * (capped per line); the guest cart and cookie are then removed.
 */
export async function mergeGuestCart(profileId: string) {
  const jar = await cookies();
  const token = jar.get(CART_COOKIE)?.value;
  if (!token) return;

  const guest = await prisma.cart.findUnique({ where: { guestToken: token }, include: { items: true } });
  if (guest) {
    await prisma.$transaction(async (tx) => {
      const mine = await tx.cart.upsert({
        where: { profileId },
        update: {},
        create: { profileId },
      });
      for (const item of guest.items) {
        const existing = await tx.cartItem.findUnique({
          where: { cartId_variantId: { cartId: mine.id, variantId: item.variantId } },
        });
        const quantity = Math.min(MAX_QTY_PER_LINE, (existing?.quantity ?? 0) + item.quantity);
        await tx.cartItem.upsert({
          where: { cartId_variantId: { cartId: mine.id, variantId: item.variantId } },
          update: { quantity },
          create: { cartId: mine.id, variantId: item.variantId, quantity },
        });
      }
      if (guest.couponCode && !mine.couponCode) {
        await tx.cart.update({ where: { id: mine.id }, data: { couponCode: guest.couponCode } });
      }
      await tx.cart.delete({ where: { id: guest.id } });
    });
  }
  jar.delete(CART_COOKIE);
}

/** Empties the visitor's cart (after a successful payment). */
export async function clearCart() {
  const cartId = await findCartId();
  if (!cartId) return;
  await prisma.$transaction([
    prisma.cartItem.deleteMany({ where: { cartId } }),
    prisma.cart.update({ where: { id: cartId }, data: { couponCode: null } }),
  ]);
}

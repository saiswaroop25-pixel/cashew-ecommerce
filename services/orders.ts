import "server-only";
import { randomBytes } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { evaluateCoupon } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";
import type { CheckoutInput } from "@/lib/validators/checkout";
import { lookupCoupon, type CartView } from "@/services/cart";

export class CheckoutError extends Error {}

// Crockford-style base32 without look-alike characters.
const ALPHABET = "ABCDEFGHJKMNPQRSTVWXYZ23456789";
function generateOrderNumber() {
  const bytes = randomBytes(8);
  return "CSH-" + Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

/**
 * Turns a priced cart into a PENDING_PAYMENT order.
 *
 *  - Prices, discount and shipping come from `cart` (computed server-side from DB
 *    prices); nothing from the browser is trusted except the address.
 *  - Stock is *reserved* with one conditional UPDATE per line
 *    (`quantity - reserved >= qty`), so two shoppers can never both take the last
 *    unit. If any line fails the whole transaction rolls back.
 *  - The cart is kept until payment succeeds (payments phase).
 */
export async function createPendingOrder(args: {
  cart: CartView;
  input: CheckoutInput;
  profileId: string | null;
}) {
  const { cart, input, profileId } = args;
  if (!cart.cartId || cart.lines.length === 0) throw new CheckoutError("Your cart is empty.");
  if (!cart.canCheckout) throw new CheckoutError("Some items in your cart are unavailable. Please review your cart.");

  // Re-validate the coupon at the moment of ordering.
  let couponId: string | null = null;
  let discountPaise = 0;
  if (cart.coupon) {
    const rule = await lookupCoupon(cart.coupon.code);
    const result = evaluateCoupon(rule, cart.totals.subtotalPaise, new Date());
    if (!result.ok) throw new CheckoutError(result.reason);
    discountPaise = result.discountPaise;
    couponId = (await prisma.coupon.findUnique({ where: { code: cart.coupon.code }, select: { id: true } }))?.id ?? null;
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        for (const line of cart.lines) {
          const updated = await tx.$executeRaw`
            UPDATE "Inventory"
               SET "reserved" = "reserved" + ${line.quantity}
             WHERE "variantId" = ${line.variantId}
               AND "quantity" - "reserved" >= ${line.quantity}`;
          if (updated === 0) {
            throw new CheckoutError(`Sorry, "${line.productName} (${line.variantLabel})" just went out of stock or has fewer units than you chose.`);
          }
        }

        const subtotal = cart.totals.subtotalPaise;
        const total = subtotal - discountPaise + cart.totals.shippingPaise;
        return tx.order.create({
          data: {
            orderNumber: generateOrderNumber(),
            accessToken: randomBytes(24).toString("hex"),
            profileId,
            email: input.email,
            customerName: input.fullName,
            phone: input.phone,
            shipLine1: input.line1,
            shipLine2: input.line2,
            shipCity: input.city,
            shipState: input.state,
            shipPostal: input.postalCode,
            notes: input.notes,
            couponId,
            subtotalPaise: subtotal,
            discountPaise,
            shippingPaise: cart.totals.shippingPaise,
            totalPaise: total,
            items: {
              create: cart.lines.map((l) => ({
                variantId: l.variantId,
                productName: l.productName,
                variantLabel: l.variantLabel,
                sku: l.sku,
                unitPricePaise: l.unitPricePaise,
                quantity: l.quantity,
                lineTotalPaise: l.lineTotalPaise,
              })),
            },
          },
          select: { id: true, orderNumber: true, accessToken: true },
        });
      });
    } catch (e) {
      // Extremely unlikely order-number collision: try again with a new number.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002" && attempt < 2) continue;
      throw e;
    }
  }
  throw new CheckoutError("Could not create your order. Please try again.");
}

/** Loads an order for its owner (signed-in) or for the holder of its access token (guest). */
export async function getOrderForViewer(orderId: string, token: string | null, profileId: string | null) {
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      OR: [...(token ? [{ accessToken: token }] : []), ...(profileId ? [{ profileId }] : [])],
    },
    include: { items: true },
  });
  return order;
}

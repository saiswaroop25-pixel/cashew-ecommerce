"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/dal";
import { verifyCheckoutSignature } from "@/lib/payments/signature";
import { prisma } from "@/lib/prisma";
import { clearCart } from "@/services/cart";
import { sendOrderPaidEmails } from "@/services/email";
import { getOrderForViewer } from "@/services/orders";
import {
  PaymentError,
  createCheckoutParams,
  fetchVerifiedPayment,
  finalizePaymentSuccess,
  type CheckoutParams,
} from "@/services/payments";

const idSchema = z.string().min(1).max(60);

async function authorise(orderId: string, token: string | null) {
  const user = await getSessionUser();
  return getOrderForViewer(orderId, token, user?.id ?? null);
}

export async function startPayment(
  orderId: string,
  token: string | null,
): Promise<{ ok: true; params: CheckoutParams } | { ok: false; message: string }> {
  if (!idSchema.safeParse(orderId).success) return { ok: false, message: "Invalid order." };
  const order = await authorise(orderId, token);
  if (!order) return { ok: false, message: "Order not found." };
  if (order.status !== "PENDING_PAYMENT") return { ok: false, message: "This order is no longer awaiting payment." };
  try {
    return { ok: true, params: await createCheckoutParams(order.id) };
  } catch (e) {
    console.error("startPayment failed", e);
    return { ok: false, message: e instanceof PaymentError ? e.message : "Could not start the payment. Please try again." };
  }
}

const confirmSchema = z.object({
  razorpay_order_id: z.string().min(1).max(60),
  razorpay_payment_id: z.string().min(1).max(60),
  razorpay_signature: z.string().min(1).max(200),
});

/**
 * Called from the browser after the Razorpay popup reports success. Nothing in the
 * request is trusted until the HMAC signature checks out, and the payment is then
 * re-read from Razorpay's authenticated API before the order is marked paid.
 */
export async function confirmPayment(
  orderId: string,
  token: string | null,
  payload: unknown,
): Promise<{ ok: boolean; message?: string }> {
  const parsed = confirmSchema.safeParse(payload);
  if (!parsed.success || !idSchema.safeParse(orderId).success) return { ok: false, message: "Invalid payment details." };
  const order = await authorise(orderId, token);
  if (!order) return { ok: false, message: "Order not found." };

  const { razorpay_order_id: rzOrderId, razorpay_payment_id: rzPaymentId, razorpay_signature: signature } = parsed.data;

  // The Razorpay order must be one we created for THIS order.
  const payment = await prisma.payment.findFirst({ where: { orderId: order.id, providerOrderId: rzOrderId } });
  if (!payment) return { ok: false, message: "Payment does not match this order." };

  const valid = verifyCheckoutSignature({
    razorpayOrderId: rzOrderId,
    razorpayPaymentId: rzPaymentId,
    signature,
    keySecret: process.env.RAZORPAY_KEY_SECRET ?? "",
  });
  if (!valid) {
    console.warn("confirmPayment: bad signature for order", order.orderNumber);
    return {
      ok: false,
      message: "We could not verify this payment. If money was deducted, it will be matched automatically or refunded.",
    };
  }

  try {
    const verified = await fetchVerifiedPayment(rzOrderId, rzPaymentId, order.totalPaise);
    const result = await finalizePaymentSuccess({
      razorpayOrderId: rzOrderId,
      razorpayPaymentId: rzPaymentId,
      amountPaise: verified.amountPaise,
      method: verified.method,
    });
    if (result.kind !== "paid") {
      return { ok: false, message: "Your payment was received but the order could not be completed. We will refund it automatically." };
    }
    await clearCart();
    if (result.firstTime) await sendOrderPaidEmails(order.id);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    console.error("confirmPayment failed", e);
    return {
      ok: false,
      message:
        e instanceof PaymentError
          ? e.message
          : "We could not confirm your payment yet. If money was deducted, it will be matched automatically.",
    };
  }
}

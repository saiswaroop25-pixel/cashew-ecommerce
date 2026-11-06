import { createHmac, timingSafeEqual } from "node:crypto";

/** Constant-time comparison of two hex strings (length mismatch -> false, never throws). */
function safeEqualHex(a: string, b: string): boolean {
  if (!/^[0-9a-f]+$/i.test(a) || !/^[0-9a-f]+$/i.test(b)) return false;
  const ab = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  return ab.length === bb.length && ab.length > 0 && timingSafeEqual(ab, bb);
}

const hmacHex = (secret: string, payload: string | Buffer) =>
  createHmac("sha256", secret).update(payload).digest("hex");

/**
 * Checkout (browser) signature: HMAC-SHA256 of "<razorpay_order_id>|<razorpay_payment_id>"
 * keyed with the Razorpay KEY SECRET. Proves the payment id belongs to our order.
 */
export function verifyCheckoutSignature(args: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  signature: string;
  keySecret: string;
}): boolean {
  const { razorpayOrderId, razorpayPaymentId, signature, keySecret } = args;
  if (!razorpayOrderId || !razorpayPaymentId || !signature || !keySecret) return false;
  return safeEqualHex(hmacHex(keySecret, `${razorpayOrderId}|${razorpayPaymentId}`), signature);
}

/**
 * Webhook signature: HMAC-SHA256 of the RAW request body keyed with the WEBHOOK SECRET
 * (a different secret from the key secret). Must be computed over the exact bytes received.
 */
export function verifyWebhookSignature(args: { rawBody: string | Buffer; signature: string; webhookSecret: string }): boolean {
  const { rawBody, signature, webhookSecret } = args;
  if (!signature || !webhookSecret) return false;
  return safeEqualHex(hmacHex(webhookSecret, rawBody), signature);
}

/** For tests/scripts only: produce valid signatures. */
export const _sign = { checkout: (secret: string, orderId: string, paymentId: string) => hmacHex(secret, `${orderId}|${paymentId}`), webhook: hmacHex };

import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { verifyWebhookSignature } from "@/lib/payments/signature";
import { prisma } from "@/lib/prisma";
import { sendOrderPaidEmails } from "@/services/email";
import {
  fetchVerifiedPayment,
  finalizePaymentSuccess,
  getRazorpay,
  recordPaymentFailure,
  recordRefund,
} from "@/services/payments";

type PaymentEntity = {
  id: string;
  order_id?: string;
  amount?: number;
  method?: string;
  status?: string;
  error_description?: string;
};

type WebhookBody = {
  event?: string;
  payload?: {
    payment?: { entity?: PaymentEntity };
    refund?: { entity?: { payment_id?: string } };
  };
};

/**
 * Razorpay -> us. Order of checks matters:
 *  1. the secret must be configured (fail closed),
 *  2. the signature must match the RAW body (before any JSON parsing),
 *  3. repeated deliveries are ignored (event-id dedupe + idempotent state machine).
 * We answer 2xx only when handled, and 5xx on failure so Razorpay retries.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    console.error("razorpay webhook: RAZORPAY_WEBHOOK_SECRET is not set");
    return new NextResponse("Webhook not configured", { status: 503 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  if (!verifyWebhookSignature({ rawBody, signature, webhookSecret: secret })) {
    console.warn("razorpay webhook: invalid signature");
    return new NextResponse("Invalid signature", { status: 400 });
  }

  let body: WebhookBody;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return new NextResponse("Bad request", { status: 400 });
  }
  const type = body.event ?? "unknown";
  const eventId = request.headers.get("x-razorpay-event-id") ?? createHash("sha256").update(rawBody).digest("hex");

  try {
    await prisma.webhookEvent.create({ data: { id: eventId, provider: "razorpay", type } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    console.error("razorpay webhook: could not record event", e);
    return new NextResponse("Server error", { status: 500 });
  }

  try {
    await handleEvent(type, body);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("razorpay webhook: handler failed", type, e);
    // Let Razorpay retry: forget the marker so the retry is not skipped as a duplicate.
    await prisma.webhookEvent.delete({ where: { id: eventId } }).catch(() => {});
    return new NextResponse("Server error", { status: 500 });
  }
}

async function handleEvent(type: string, body: WebhookBody) {
  const payment = body.payload?.payment?.entity;

  switch (type) {
    case "payment.captured":
    case "order.paid": {
      if (!payment?.order_id) return;
      const result = await finalizePaymentSuccess({
        razorpayOrderId: payment.order_id,
        razorpayPaymentId: payment.id,
        amountPaise: payment.amount,
        method: payment.method ?? null,
        // Only non-sensitive fields are kept (never card data).
        raw: { event: type, paymentId: payment.id, status: payment.status ?? null, method: payment.method ?? null, amount: payment.amount ?? null },
      });
      if (result.kind === "paid" && result.firstTime) await sendOrderPaidEmails(result.orderId);
      return;
    }
    case "payment.authorized": {
      // Only matters if auto-capture is off in the Razorpay dashboard: capture it, which triggers payment.captured.
      if (!payment?.order_id) return;
      const ours = await prisma.payment.findUnique({ where: { providerOrderId: payment.order_id } });
      if (!ours) return;
      await fetchVerifiedPayment(payment.order_id, payment.id, ours.amountPaise);
      return;
    }
    case "payment.failed": {
      if (!payment?.order_id) return;
      await recordPaymentFailure({
        razorpayOrderId: payment.order_id,
        razorpayPaymentId: payment.id,
        reason: payment.error_description,
      });
      return;
    }
    case "refund.processed": {
      const paymentId = body.payload?.refund?.entity?.payment_id;
      if (!paymentId) return;
      // Ask Razorpay for the authoritative refunded total instead of adding up events.
      const p = await getRazorpay().payments.fetch(paymentId);
      await recordRefund({ razorpayPaymentId: paymentId, refundedPaise: Number(p.amount_refunded ?? 0) });
      return;
    }
    default:
      return; // unsubscribed/unknown events are acknowledged and ignored
  }
}

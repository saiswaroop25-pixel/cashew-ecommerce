import { describe, expect, it } from "vitest";
import { _sign, verifyCheckoutSignature, verifyWebhookSignature } from "@/lib/payments/signature";

const SECRET = "test_key_secret";
const WH = "test_webhook_secret";

describe("verifyCheckoutSignature", () => {
  const sig = _sign.checkout(SECRET, "order_ABC", "pay_123");
  const base = { razorpayOrderId: "order_ABC", razorpayPaymentId: "pay_123", signature: sig, keySecret: SECRET };

  it("accepts a correct signature", () => {
    expect(verifyCheckoutSignature(base)).toBe(true);
  });
  it("rejects a tampered payment id, order id or signature", () => {
    expect(verifyCheckoutSignature({ ...base, razorpayPaymentId: "pay_999" })).toBe(false);
    expect(verifyCheckoutSignature({ ...base, razorpayOrderId: "order_XYZ" })).toBe(false);
    expect(verifyCheckoutSignature({ ...base, signature: sig.replace(/.$/, sig.endsWith("0") ? "1" : "0") })).toBe(false);
  });
  it("rejects the wrong secret", () => {
    expect(verifyCheckoutSignature({ ...base, keySecret: "other" })).toBe(false);
  });
  it.each(["", "zz", "abc", "x".repeat(64)])("rejects malformed signature %j without throwing", (signature) => {
    expect(verifyCheckoutSignature({ ...base, signature })).toBe(false);
  });
  it("rejects empty inputs (a missing secret must never validate)", () => {
    expect(verifyCheckoutSignature({ ...base, keySecret: "" })).toBe(false);
    expect(verifyCheckoutSignature({ ...base, razorpayOrderId: "" })).toBe(false);
  });
  it("is not fooled by the webhook secret / swapped secrets", () => {
    expect(verifyCheckoutSignature({ ...base, signature: _sign.checkout(WH, "order_ABC", "pay_123") })).toBe(false);
  });
});

describe("verifyWebhookSignature", () => {
  const body = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: { id: "pay_1" } } } });
  const sig = _sign.webhook(WH, body);

  it("accepts the exact raw body", () => {
    expect(verifyWebhookSignature({ rawBody: body, signature: sig, webhookSecret: WH })).toBe(true);
    expect(verifyWebhookSignature({ rawBody: Buffer.from(body), signature: sig, webhookSecret: WH })).toBe(true);
  });
  it("rejects a body that was changed by even one byte (e.g. re-serialised JSON)", () => {
    expect(verifyWebhookSignature({ rawBody: body + " ", signature: sig, webhookSecret: WH })).toBe(false);
    expect(verifyWebhookSignature({ rawBody: JSON.stringify(JSON.parse(body), null, 2), signature: sig, webhookSecret: WH })).toBe(false);
  });
  it("rejects wrong/missing secret or signature", () => {
    expect(verifyWebhookSignature({ rawBody: body, signature: sig, webhookSecret: "nope" })).toBe(false);
    expect(verifyWebhookSignature({ rawBody: body, signature: sig, webhookSecret: "" })).toBe(false);
    expect(verifyWebhookSignature({ rawBody: body, signature: "", webhookSecret: WH })).toBe(false);
  });
});

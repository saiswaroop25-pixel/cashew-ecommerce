import { describe, expect, it } from "vitest";
import { bulkEnquiryWhatsAppMessage, whatsappLink } from "@/lib/whatsapp";
import { formatReference, makeBulkEnquirySchema } from "@/lib/validators/bulk";

const TODAY = new Date("2026-06-15T10:00:00Z");
const schema = makeBulkEnquirySchema(TODAY);
const ok = {
  fullName: "Ravi Kumar", companyName: "Kumar Traders", email: " Ravi@Kumar.IN ", phone: "+91 98765-43210",
  location: "Bengaluru", variety: "RAW", grade: "W240", quantityKg: "500", packaging: "BULK_BAGS", consent: "on",
};

describe("bulk enquiry schema", () => {
  it("accepts a valid enquiry and normalises values", () => {
    const r = schema.parse(ok);
    expect(r.email).toBe("ravi@kumar.in");
    expect(r.phone).toBe("+919876543210");
    expect(r.quantityKg).toBe(500);
    expect(r.whatsapp).toBeNull();
    expect(r.expectedDelivery).toBeNull();
    expect(r.requirements).toBeNull();
  });
  it("requires consent and the key fields", () => {
    expect(schema.safeParse({ ...ok, consent: undefined }).success).toBe(false);
    expect(schema.safeParse({}).success).toBe(false);
  });
  it.each(["0", "-5", "1.5", "abc", "1000001", ""])("rejects quantity %j", (quantityKg) => {
    expect(schema.safeParse({ ...ok, quantityKg }).success).toBe(false);
  });
  it("rejects unknown varieties, grades and packaging (no free-text injection)", () => {
    expect(schema.safeParse({ ...ok, variety: "GOLD" }).success).toBe(false);
    expect(schema.safeParse({ ...ok, grade: "W999" }).success).toBe(false);
    expect(schema.safeParse({ ...ok, packaging: "x" }).success).toBe(false);
  });
  it("accepts 'OTHER' variety and 'ANY' grade", () => {
    expect(schema.safeParse({ ...ok, variety: "OTHER", grade: "ANY" }).success).toBe(true);
  });
  it("validates the delivery date (today ok, past rejected, junk rejected)", () => {
    expect(schema.parse({ ...ok, expectedDelivery: "2026-06-15" }).expectedDelivery).toEqual(new Date("2026-06-15T00:00:00Z"));
    expect(schema.safeParse({ ...ok, expectedDelivery: "2026-06-14" }).success).toBe(false);
    expect(schema.safeParse({ ...ok, expectedDelivery: "2026-13-45" }).success).toBe(false);
    expect(schema.safeParse({ ...ok, expectedDelivery: "tomorrow" }).success).toBe(false);
  });
  it("validates optional WhatsApp and caps long text", () => {
    expect(schema.parse({ ...ok, whatsapp: "98765 43210" }).whatsapp).toBe("9876543210");
    expect(schema.safeParse({ ...ok, whatsapp: "12" }).success).toBe(false);
    expect(schema.safeParse({ ...ok, requirements: "x".repeat(1001) }).success).toBe(false);
  });
  it("rejects a filled honeypot", () => {
    expect(schema.safeParse({ ...ok, website: "http://spam" }).success).toBe(false);
  });
});

describe("formatReference", () => {
  it("pads to six digits", () => {
    expect(formatReference(2026, 217)).toBe("BLK-2026-000217");
    expect(formatReference(2026, 123456)).toBe("BLK-2026-123456");
  });
});

describe("whatsappLink", () => {
  it("builds a wa.me link with an encoded message", () => {
    const link = whatsappLink("+91 98765 43210", "Hi there & welcome");
    expect(link).toBe("https://wa.me/919876543210?text=Hi%20there%20%26%20welcome");
  });
  it.each([undefined, null, "", "abc", "12345", "0123456789", "+1234567890123456"])("returns null for unusable number %j", (n) => {
    expect(whatsappLink(n as string | undefined, "x")).toBeNull();
  });
  it("includes the reference in the prefilled message when given", () => {
    expect(bulkEnquiryWhatsAppMessage("BLK-2026-000001")).toContain("BLK-2026-000001");
    expect(bulkEnquiryWhatsAppMessage()).not.toContain("BLK-");
  });
});

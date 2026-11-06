import { describe, expect, it } from "vitest";
import { publicSchema, serverSchema } from "@/lib/env";

describe("env schemas", () => {
  it("rejects missing server secrets", () => {
    expect(serverSchema.safeParse({}).success).toBe(false);
  });
  it("accepts a complete public config", () => {
    const r = publicSchema.safeParse({
      NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
      NEXT_PUBLIC_RAZORPAY_KEY_ID: "rzp_test_x",
      NEXT_PUBLIC_WHATSAPP_NUMBER: "919000000000",
    });
    expect(r.success).toBe(true);
  });
  it("rejects a malformed WhatsApp number", () => {
    const r = publicSchema.safeParse({
      NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "a",
      NEXT_PUBLIC_RAZORPAY_KEY_ID: "k",
      NEXT_PUBLIC_WHATSAPP_NUMBER: "+91 98",
    });
    expect(r.success).toBe(false);
  });
});

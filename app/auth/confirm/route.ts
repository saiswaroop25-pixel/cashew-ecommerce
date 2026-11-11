import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { safeNext } from "@/lib/auth/safe-next";
import { createClient } from "@/lib/supabase/server";
import { mergeGuestCart } from "@/services/cart";

const TYPES: EmailOtpType[] = ["signup", "recovery", "email", "invite", "magiclink", "email_change"];

/**
 * Email-link landing point that does not depend on a cookie set when the email was requested, so the link works
 * even when it is opened in another browser or on another device. The Supabase email templates point here
 * (see README, "Email templates").
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeNext(searchParams.get("next"));

  if (tokenHash && type && TYPES.includes(type)) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      if (data.user) await mergeGuestCart(data.user.id);
      return NextResponse.redirect(new URL(next, origin));
    }
  }
  return NextResponse.redirect(new URL("/login?error=link", origin));
}

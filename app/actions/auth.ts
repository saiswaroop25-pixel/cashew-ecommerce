"use server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { safeNext } from "@/lib/auth/safe-next";
import { prisma } from "@/lib/prisma";
import { site } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";
import { mergeGuestCart } from "@/services/cart";
import {
  echoValues,
  fieldErrors,
  forgotSchema,
  loginSchema,
  registerSchema,
  resetSchema,
  type FormState,
} from "@/lib/validators/auth";
import { rateLimited } from "@/services/rate-limit";

const GENERIC_LOGIN_ERROR = "Invalid email or password.";

export async function signUp(_prev: FormState, fd: FormData): Promise<FormState> {
  const values = echoValues(fd);
  const limited = await rateLimited("signup");
  if (limited) return { ok: false, message: limited, values };
  const parsed = registerSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error), values };

  // Implicit flow, like the password reset: the confirmation link then works in any browser or on a phone, not only
  // in the browser that created the account (see app/auth/hash/page.tsx).
  const signUpClient = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await signUpClient.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${site.url}/auth/hash?next=/account`,
    },
  });

  if (error) {
    console.error("signUp failed", error.code, error.status);
    const limited = error.code === "over_email_send_rate_limit" || error.status === 429;
    return {
      ok: false,
      values,
      message: limited
        ? "Too many sign-up emails were requested. Please wait a few minutes and try again."
        : "We could not create your account. Please check your details and try again.",
    };
  }
  // Email confirmation disabled in Supabase -> already signed in.
  if (data.session) {
    const supabase = await createClient();
    await supabase.auth.setSession({ access_token: data.session.access_token, refresh_token: data.session.refresh_token });
    redirect("/account");
  }

  // Same message whether or not the address already exists (no account enumeration).
  return { ok: true, message: "Almost there! Check your email for a link to confirm your account." };
}

export async function signIn(_prev: FormState, fd: FormData): Promise<FormState> {
  const values = echoValues(fd);
  // limit per address AND per account being tried (stops password guessing against one email)
  const limited = await rateLimited("login", String(fd.get("email") ?? "").trim());
  if (limited) return { ok: false, message: limited, values };
  const parsed = loginSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error), values };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return {
      ok: false,
      values,
      message:
        error.code === "email_not_confirmed"
          ? "Please confirm your email first – check your inbox for the link we sent."
          : GENERIC_LOGIN_ERROR,
    };
  }
  // Keep anything they added to the cart before signing in.
  if (data.user) await mergeGuestCart(data.user.id);
  const requested = safeNext(fd.get("next"), "");
  if (requested) redirect(requested);
  // No specific page asked for: admins land in the dashboard, customers in their account.
  const profile = data.user ? await prisma.profile.findUnique({ where: { id: data.user.id }, select: { role: true } }) : null;
  redirect(profile?.role === "ADMIN" ? "/admin" : "/account");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function requestPasswordReset(_prev: FormState, fd: FormData): Promise<FormState> {
  const values = echoValues(fd);
  const limited = await rateLimited("passwordReset", String(fd.get("email") ?? "").trim());
  if (limited) return { ok: false, message: limited, values };
  const parsed = forgotSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error), values };

  // Implicit flow on purpose: the default (PKCE) link only works in the browser that requested it, which breaks
  // links opened on a phone or in a mail app. This link works anywhere (see app/auth/hash/page.tsx).
  const supabase = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false },
  });
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${site.url}/auth/hash?next=/reset-password`,
  });
  if (error) console.error("resetPasswordForEmail failed", error.code, error.status);
  // Identical response regardless of outcome.
  return { ok: true, message: "If an account exists for that address, we have sent a password reset link." };
}

export async function updatePassword(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = resetSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    return { ok: false, message: "This reset link has expired. Please request a new one." };
  }
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    console.error("updateUser failed", error.code);
    return {
      ok: false,
      message:
        error.code === "same_password"
          ? "Choose a password different from your current one."
          : "We could not update your password. Please try again.",
    };
  }
  redirect("/account?password=updated");
}

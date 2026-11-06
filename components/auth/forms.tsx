"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset, signIn, signUp, updatePassword } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, FormMessage } from "@/components/ui/field";
import type { FormState } from "@/lib/validators/auth";

const initial: FormState = { ok: false };

export function LoginForm({ next }: { next?: string }) {
  const [s, action, pending] = useActionState(signIn, initial);
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next ?? ""} />
      <FormMessage ok={s.ok} message={s.message} />
      <Field label="Email" name="email" type="email" autoComplete="email" required defaultValue={s.values?.email} error={s.errors?.email} />
      <Field label="Password" name="password" type="password" autoComplete="current-password" required error={s.errors?.password} />
      <Button type="submit" className="w-full" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</Button>
      <p className="flex justify-between text-sm">
        <Link href="/forgot-password" className="text-forest underline">Forgot password?</Link>
        <Link href="/register" className="text-forest underline">Create account</Link>
      </p>
    </form>
  );
}

export function RegisterForm() {
  const [s, action, pending] = useActionState(signUp, initial);
  if (s.ok) return <FormMessage ok message={s.message} />;
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage ok={s.ok} message={s.message} />
      <Field label="Full name" name="fullName" autoComplete="name" required defaultValue={s.values?.fullName} error={s.errors?.fullName} />
      <Field label="Email" name="email" type="email" autoComplete="email" required defaultValue={s.values?.email} error={s.errors?.email} />
      <Field label="Password" name="password" type="password" autoComplete="new-password" required hint="At least 8 characters, with a letter and a number." error={s.errors?.password} />
      <Field label="Confirm password" name="confirmPassword" type="password" autoComplete="new-password" required error={s.errors?.confirmPassword} />
      <Button type="submit" className="w-full" disabled={pending}>{pending ? "Creating account…" : "Create account"}</Button>
      <p className="text-sm text-brown">
        Already registered? <Link href="/login" className="text-forest underline">Sign in</Link>
      </p>
    </form>
  );
}

export function ForgotForm() {
  const [s, action, pending] = useActionState(requestPasswordReset, initial);
  if (s.ok) return <FormMessage ok message={s.message} />;
  return (
    <form action={action} className="space-y-4" noValidate>
      <Field label="Email" name="email" type="email" autoComplete="email" required defaultValue={s.values?.email} error={s.errors?.email} />
      <Button type="submit" className="w-full" disabled={pending}>{pending ? "Sending…" : "Send reset link"}</Button>
      <p className="text-sm"><Link href="/login" className="text-forest underline">Back to sign in</Link></p>
    </form>
  );
}

export function ResetForm() {
  const [s, action, pending] = useActionState(updatePassword, initial);
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage ok={s.ok} message={s.message} />
      <Field label="New password" name="password" type="password" autoComplete="new-password" required hint="At least 8 characters, with a letter and a number." error={s.errors?.password} />
      <Field label="Confirm new password" name="confirmPassword" type="password" autoComplete="new-password" required error={s.errors?.confirmPassword} />
      <Button type="submit" className="w-full" disabled={pending}>{pending ? "Saving…" : "Update password"}</Button>
    </form>
  );
}

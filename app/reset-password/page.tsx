import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { ResetForm } from "@/components/auth/forms";
import { getSessionUser } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Reset password", robots: { index: false } };

export default function ResetPasswordPage() {
  return (
    <AuthCard title="Choose a new password">
      <Suspense fallback={null}>
        <Body />
      </Suspense>
    </AuthCard>
  );
}

/** The emailed link signs the visitor in via /auth/callback; without that session there is nothing to reset. */
async function Body() {
  if (!(await getSessionUser())) {
    return (
      <p className="text-sm text-brown">
        This reset link is missing or has expired.{" "}
        <Link href="/forgot-password" className="text-forest underline">Request a new one</Link>.
      </p>
    );
  }
  return <ResetForm />;
}

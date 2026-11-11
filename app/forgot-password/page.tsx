import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { ForgotForm } from "@/components/auth/forms";

export const metadata: Metadata = { title: "Forgot password", description: "Request a link to reset your account password.", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <AuthCard title="Forgot password" intro="Enter your email and we will send you a reset link.">
      <ForgotForm />
    </AuthCard>
  );
}

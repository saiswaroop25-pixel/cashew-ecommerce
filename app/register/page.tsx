import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { RegisterForm } from "@/components/auth/forms";
import { getSessionUser } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Create account", robots: { index: false } };

export default function RegisterPage() {
  return (
    <AuthCard title="Create account" intro="Track orders, save addresses and check out faster.">
      <Suspense fallback={null}>
        <Body />
      </Suspense>
    </AuthCard>
  );
}

async function Body() {
  if (await getSessionUser()) redirect("/account");
  return <RegisterForm />;
}

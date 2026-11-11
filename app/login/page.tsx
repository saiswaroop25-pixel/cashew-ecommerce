import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/forms";
import { FormMessage } from "@/components/ui/field";
import { getSessionUser } from "@/lib/auth/dal";
import { safeNext } from "@/lib/auth/safe-next";

export const metadata: Metadata = { title: "Sign in", description: "Sign in to view your orders, saved addresses and wishlist.", robots: { index: false } };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <AuthCard title="Sign in">
      <Suspense fallback={null}>
        <Body searchParams={searchParams} />
      </Suspense>
    </AuthCard>
  );
}

async function Body({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? safeNext(sp.next, "") : "";
  if (await getSessionUser()) redirect(next || "/account");
  return (
    <div className="space-y-4">
      {sp.error === "link" && (
        <FormMessage message="That link is invalid or has expired. Please try again." />
      )}
      <LoginForm next={next} />
    </div>
  );
}

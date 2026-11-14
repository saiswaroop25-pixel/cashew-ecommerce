import type { Metadata } from "next";
import { Suspense } from "react";
import { DataRequestForm } from "@/components/account/data-request-form";
import { getSessionUser } from "@/lib/auth/dal";
import { POLICY_TERMS } from "@/lib/policies";

export const metadata: Metadata = {
  title: "Your data: access, correct or delete",
  description: "Ask us to send you a copy of your personal data, correct it or delete it.",
  alternates: { canonical: "/data-request" },
};

export default function DataRequestPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="font-serif text-4xl text-forest">Your data</h1>
      <p className="mt-4 text-chocolate">
        You can ask us to send you a copy of the personal data we hold about you, to correct it, or to delete it. We aim to reply
        within {POLICY_TERMS.privacyReplyDays} days.
      </p>
      <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-brown">
        <li>We will confirm that you own the email address before we act.</li>
        <li>Order and payment records are kept for as long as the law requires for accounting, but we remove what we can.</li>
        <li>To stop newsletter emails, use the unsubscribe link in any email.</li>
      </ul>
      <div className="mt-8">
        <Suspense fallback={<DataRequestForm />}>
          <WithEmail />
        </Suspense>
      </div>
    </main>
  );
}

async function WithEmail() {
  const user = await getSessionUser();
  return <DataRequestForm defaultEmail={user?.email ?? undefined} />;
}

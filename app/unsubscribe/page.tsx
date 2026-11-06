import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { unsubscribeNewsletter } from "@/app/actions/newsletter";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Unsubscribe",
  robots: { index: false },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function UnsubscribePage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main className="mx-auto w-full max-w-lg px-4 py-16 text-center sm:px-6">
      <h1 className="font-serif text-3xl text-forest">Unsubscribe</h1>
      <Suspense fallback={null}>
        <Body searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Body({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const token = typeof sp.token === "string" ? sp.token : "";
  const done = sp.done === "1";
  if (!token) return <p className="mt-4 text-brown">This unsubscribe link is not valid.</p>;
  if (done) return <p className="mt-4 text-brown">You have been unsubscribed.</p>;

  // A button (POST) rather than acting on GET, so email link scanners cannot unsubscribe people.
  async function confirm(formData: FormData) {
    "use server";
    await unsubscribeNewsletter(formData);
    redirect(`/unsubscribe?token=${encodeURIComponent(String(formData.get("token")))}&done=1`);
  }
  return (
    <form action={confirm} className="mt-6">
      <input type="hidden" name="token" value={token} />
      <p className="mb-4 text-brown">Click below to stop receiving our marketing emails.</p>
      <Button type="submit">Confirm unsubscribe</Button>
    </form>
  );
}

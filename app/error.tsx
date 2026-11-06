"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Shown when something unexpected breaks while rendering a page. It never shows technical details:
 * in production Next replaces the real message with a generic one plus a reference code (`digest`)
 * that matches the server log, so we can find the cause without exposing it to visitors.
 */
export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  const digest = error instanceof Error ? (error as Error & { digest?: string }).digest : undefined;
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <p className="text-xs uppercase tracking-[0.3em] text-gold">Something went wrong</p>
      <h1 className="mt-3 font-serif text-4xl text-forest">We hit a snag</h1>
      <p className="mt-4 text-brown">
        Sorry about that. Please try again. If it keeps happening, let us know and quote the reference below.
      </p>
      {digest && <p className="mt-3 rounded-lg bg-cashew/50 px-3 py-1 font-mono text-xs text-chocolate">Reference: {digest}</p>}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button type="button" onClick={() => retry()}>Try again</Button>
        <Link href="/" className={cn(buttonVariants({ variant: "outline" }))}>Back to the home page</Link>
      </div>
    </main>
  );
}

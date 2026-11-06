"use client";

import { useActionState } from "react";
import { subscribeNewsletter } from "@/app/actions/newsletter";
import { Button } from "@/components/ui/button";
import type { NewsletterState } from "@/lib/validators/newsletter";

const initial: NewsletterState = { ok: false, message: "" };

export function NewsletterForm() {
  const [state, action, pending] = useActionState(subscribeNewsletter, initial);

  if (state.ok) {
    return <p role="status" className="text-cream">{state.message}</p>;
  }

  return (
    <form action={action} className="w-full max-w-md space-y-3" noValidate>
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="sr-only" htmlFor="nl-email">Email address</label>
        <input
          id="nl-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          defaultValue={state.email}
          placeholder="you@example.com"
          aria-describedby="nl-error"
          className="flex-1 rounded-full border border-cream/30 bg-white px-5 py-3 text-sm text-chocolate"
        />
        <Button type="submit" variant="gold" disabled={pending}>
          {pending ? "Subscribing…" : "Subscribe"}
        </Button>
      </div>
      {/* Honeypot – hidden from people and assistive tech */}
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
      <label className="flex items-start gap-2 text-xs text-cream/80">
        <input type="checkbox" name="consent" className="mt-0.5" required />
        I agree to receive marketing emails and understand I can unsubscribe at any time.
      </label>
      <p id="nl-error" role="alert" className="min-h-4 text-xs text-gold">
        {state.message}
      </p>
    </form>
  );
}

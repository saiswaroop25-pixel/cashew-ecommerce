"use client";

import Link from "next/link";
import { useActionState } from "react";
import { submitDataRequest, type DataRequestState } from "@/app/actions/data-request";
import { Button } from "@/components/ui/button";
import { Field, FormMessage } from "@/components/ui/field";
import { DATA_REQUEST_KINDS, DATA_REQUEST_LABELS } from "@/lib/validators/data-request";

const initial: DataRequestState = { ok: false };

export function DataRequestForm({ defaultEmail }: { defaultEmail?: string }) {
  const [s, action, pending] = useActionState(submitDataRequest, initial);
  const e = s.errors ?? {};

  if (s.ok) {
    return (
      <div role="status" className="rounded-card bg-white p-6 shadow-soft">
        <p className="font-serif text-xl text-forest">Request received</p>
        <p className="mt-2 text-chocolate">{s.message}</p>
        {s.reference && <p className="mt-2 text-sm text-brown">Your reference: <strong>{s.reference}</strong></p>}
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5 rounded-card bg-white p-6 shadow-soft" noValidate>
      <FormMessage ok={s.ok} message={s.message} />
      <Field label="Your email address" name="email" type="email" autoComplete="email" required defaultValue={s.values?.email ?? defaultEmail} error={e.email} hint="Use the address you ordered or signed up with." />
      <fieldset>
        <legend className="mb-2 block text-sm text-brown">What would you like us to do?</legend>
        <div className="space-y-2">
          {DATA_REQUEST_KINDS.map((k) => (
            <label key={k} className="flex items-center gap-2 text-chocolate">
              <input type="radio" name="kind" value={k} defaultChecked={(s.values?.kind ?? "DELETE") === k} />
              {DATA_REQUEST_LABELS[k]}
            </label>
          ))}
        </div>
        {e.kind && <p className="mt-1 text-xs text-red-700">{e.kind}</p>}
      </fieldset>
      <div>
        <label htmlFor="f-details" className="mb-1 block text-sm text-brown">Anything we should know? (optional)</label>
        <textarea id="f-details" name="details" rows={4} maxLength={1000} defaultValue={s.values?.details} className="w-full rounded-lg border border-cashew bg-white px-3 py-2.5 text-sm text-chocolate" />
        {e.details && <p className="mt-1 text-xs text-red-700">{e.details}</p>}
      </div>
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
      <p className="text-xs text-brown">
        We use these details only to handle your request. See our <Link className="underline" href="/legal/privacy-policy">Privacy Policy</Link>.
      </p>
      <Button type="submit" size="lg" disabled={pending}>{pending ? "Sending…" : "Send request"}</Button>
    </form>
  );
}

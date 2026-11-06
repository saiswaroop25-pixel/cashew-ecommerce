"use client";

import { useActionState, useState } from "react";
import { placeOrder } from "@/app/actions/checkout";
import { Button } from "@/components/ui/button";
import { Field, FormMessage } from "@/components/ui/field";
import { INDIAN_STATES } from "@/lib/india";
import type { FormState } from "@/lib/validators/auth";

type SavedAddress = {
  id: string; label: string | null; fullName: string; phone: string; line1: string; line2: string | null;
  city: string; state: string; postalCode: string;
};

const initial: FormState = { ok: false };

export function CheckoutForm({
  defaults,
  addresses,
  isSignedIn,
}: {
  defaults: { fullName: string; email: string; phone: string; address?: SavedAddress };
  addresses: SavedAddress[];
  isSignedIn: boolean;
}) {
  const [s, action, pending] = useActionState(placeOrder, initial);
  const start = defaults.address;
  const [f, setF] = useState({
    fullName: start?.fullName ?? defaults.fullName,
    email: defaults.email,
    phone: start?.phone ?? defaults.phone,
    line1: start?.line1 ?? "",
    line2: start?.line2 ?? "",
    city: start?.city ?? "",
    state: start?.state ?? "",
    postalCode: start?.postalCode ?? "",
    notes: "",
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF((v) => ({ ...v, [k]: e.target.value }));
  const e = s.errors ?? {};

  function applySavedAddress(id: string) {
    const a = addresses.find((x) => x.id === id);
    if (!a) return;
    setF((v) => ({ ...v, fullName: a.fullName, phone: a.phone, line1: a.line1, line2: a.line2 ?? "", city: a.city, state: a.state, postalCode: a.postalCode }));
  }

  return (
    <form action={action} className="space-y-5" noValidate>
      <FormMessage ok={s.ok} message={s.message} />

      <section className="space-y-4">
        <h2 className="font-serif text-2xl text-forest">Contact</h2>
        <Field label="Full name" name="fullName" autoComplete="name" required value={f.fullName} onChange={set("fullName")} error={e.fullName} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email" name="email" type="email" autoComplete="email" required value={f.email} onChange={set("email")} error={e.email} hint="Order updates are sent here." />
          <Field label="Mobile number" name="phone" type="tel" autoComplete="tel" required value={f.phone} onChange={set("phone")} error={e.phone} />
        </div>
        {!isSignedIn && (
          <p className="text-xs text-brown">Checking out as a guest. <a href="/login?next=/checkout" className="text-forest underline">Sign in</a> to use saved addresses and track orders.</p>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="font-serif text-2xl text-forest">Delivery address</h2>
        {addresses.length > 0 && (
          <div>
            <label htmlFor="saved" className="mb-1 block text-sm text-brown">Use a saved address</label>
            <select id="saved" defaultValue={start?.id ?? ""} onChange={(ev) => applySavedAddress(ev.target.value)} className="w-full rounded-lg border border-cashew bg-white px-3 py-2.5 text-sm text-chocolate">
              <option value="">Enter a new address</option>
              {addresses.map((a) => (
                <option key={a.id} value={a.id}>{a.label ? `${a.label} – ` : ""}{a.line1}, {a.city}</option>
              ))}
            </select>
          </div>
        )}
        <Field label="Address line 1" name="line1" autoComplete="address-line1" required value={f.line1} onChange={set("line1")} error={e.line1} />
        <Field label="Address line 2 (optional)" name="line2" autoComplete="address-line2" value={f.line2} onChange={set("line2")} error={e.line2} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="City" name="city" autoComplete="address-level2" required value={f.city} onChange={set("city")} error={e.city} />
          <div>
            <label htmlFor="f-state" className="mb-1 block text-sm text-brown">State</label>
            <select id="f-state" name="state" required value={f.state} onChange={set("state")} autoComplete="address-level1"
              aria-invalid={e.state ? true : undefined} aria-describedby={e.state ? "f-state-err" : undefined}
              className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-chocolate ${e.state ? "border-red-700" : "border-cashew"}`}>
              <option value="">Select state</option>
              {INDIAN_STATES.map((st) => <option key={st} value={st}>{st}</option>)}
            </select>
            {e.state && <p id="f-state-err" className="mt-1 text-xs text-red-700">{e.state}</p>}
          </div>
        </div>
        <Field label="PIN code" name="postalCode" inputMode="numeric" autoComplete="postal-code" maxLength={6} required value={f.postalCode} onChange={set("postalCode")} error={e.postalCode} />
        <div>
          <label htmlFor="f-notes" className="mb-1 block text-sm text-brown">Order notes (optional)</label>
          <textarea id="f-notes" name="notes" rows={3} maxLength={300} value={f.notes} onChange={set("notes")}
            className="w-full rounded-lg border border-cashew bg-white px-3 py-2.5 text-sm text-chocolate" />
          {e.notes && <p className="mt-1 text-xs text-red-700">{e.notes}</p>}
        </div>
      </section>

      <section>
        <h2 className="font-serif text-2xl text-forest">Payment</h2>
        <p className="mt-2 rounded-lg bg-cashew/40 px-4 py-3 text-sm text-chocolate">
          You will pay securely online (UPI, cards, netbanking) on the next step.
        </p>
      </section>

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Placing order…" : "Continue to payment"}
      </Button>
    </form>
  );
}

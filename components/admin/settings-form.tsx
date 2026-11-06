"use client";

import { useActionState } from "react";
import { saveSiteSettingsAction } from "@/app/actions/admin/content";
import { Button } from "@/components/ui/button";
import { Field, FormMessage } from "@/components/ui/field";
import type { SiteSettings } from "@/lib/site";
import type { FormState } from "@/lib/validators/auth";

const initial: FormState = { ok: false };
const area = "w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-chocolate";

export function SettingsForm({ saved }: { saved: SiteSettings }) {
  const [s, action, pending] = useActionState(saveSiteSettingsAction, initial);
  const e = s.errors ?? {};
  // Fully controlled by the server's saved values + what was just typed; a failed save keeps the typing.
  const v = (k: keyof SiteSettings) => s.values?.[k] ?? saved[k];

  return (
    <form action={action} className="space-y-8" noValidate>
      <FormMessage ok={s.ok} message={s.message} />

      <section className="space-y-4 rounded-card bg-white p-6 shadow-soft">
        <h2 className="font-serif text-xl text-forest">Your business</h2>
        <Field label="Business name" name="name" defaultValue={v("name")} error={e.name} hint="Shown in the header, the footer and in emails." maxLength={80} />
        <Field label="Tagline (optional)" name="tagline" defaultValue={v("tagline")} error={e.tagline} maxLength={120} />
        <div>
          <label htmlFor="about" className="mb-1 block text-sm text-brown">About you (optional)</label>
          <textarea id="about" name="about" rows={4} maxLength={1200} defaultValue={v("about")} className={`${area} ${e.about ? "border-red-700" : "border-cashew"}`} />
          <p className="mt-1 text-xs text-brown/70">Shown in the footer. Only write what you can stand behind (history, certifications, quality claims).</p>
          {e.about && <p className="mt-1 text-xs text-red-700">{e.about}</p>}
        </div>
      </section>

      <section className="space-y-4 rounded-card bg-white p-6 shadow-soft">
        <h2 className="font-serif text-xl text-forest">Contact</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email" name="email" type="email" defaultValue={v("email")} error={e.email} />
          <Field label="Phone" name="phone" type="tel" defaultValue={v("phone")} error={e.phone} />
          <Field label="WhatsApp number" name="whatsapp" inputMode="numeric" defaultValue={v("whatsapp")} error={e.whatsapp} hint="Digits with country code, e.g. 919876543210. Turns on the WhatsApp buttons." />
        </div>
        <div>
          <label htmlFor="address" className="mb-1 block text-sm text-brown">Address (optional)</label>
          <textarea id="address" name="address" rows={3} maxLength={400} defaultValue={v("address")} className={`${area} ${e.address ? "border-red-700" : "border-cashew"}`} />
          {e.address && <p className="mt-1 text-xs text-red-700">{e.address}</p>}
        </div>
      </section>

      <section className="space-y-4 rounded-card bg-white p-6 shadow-soft">
        <h2 className="font-serif text-xl text-forest">Social media</h2>
        <p className="text-xs text-brown">Full links starting with https://. Empty ones are not shown.</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Instagram" name="instagramUrl" type="url" defaultValue={v("instagramUrl")} error={e.instagramUrl} />
          <Field label="Facebook" name="facebookUrl" type="url" defaultValue={v("facebookUrl")} error={e.facebookUrl} />
          <Field label="YouTube" name="youtubeUrl" type="url" defaultValue={v("youtubeUrl")} error={e.youtubeUrl} />
        </div>
      </section>

      <Button type="submit" size="lg" disabled={pending}>{pending ? "Saving…" : "Save details"}</Button>
    </form>
  );
}

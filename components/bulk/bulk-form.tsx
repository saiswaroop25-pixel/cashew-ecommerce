"use client";

import { useActionState } from "react";
import { submitBulkEnquiry, type BulkFormState } from "@/app/actions/bulk";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, FormMessage } from "@/components/ui/field";
import { FORM_LABELS, GRADE_LABELS, FORMS, GRADES } from "@/lib/validators/catalog";
import { PACKAGING_OPTIONS } from "@/lib/validators/bulk";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { bulkEnquiryWhatsAppMessage, whatsappLink } from "@/lib/whatsapp";

const initial: BulkFormState = { ok: false };
const selectClass = "w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-chocolate";

function Select({ label, name, error, defaultValue, children }: { label: string; name: string; error?: string; defaultValue?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={`f-${name}`} className="mb-1 block text-sm text-brown">{label}</label>
      {/* key: React resets uncontrolled selects after a form action; remounting re-applies the echoed value */}
      <select key={defaultValue ?? ""} id={`f-${name}`} name={name} defaultValue={defaultValue ?? ""} required aria-invalid={error ? true : undefined} aria-describedby={error ? `f-${name}-err` : undefined}
        className={cn(selectClass, error ? "border-red-700" : "border-cashew")}>
        {children}
      </select>
      {error && <p id={`f-${name}-err`} className="mt-1 text-xs text-red-700">{error}</p>}
    </div>
  );
}

export function BulkForm({
  defaults,
  whatsappNumber,
}: {
  defaults: { fullName: string; email: string; phone: string };
  /** configured business WhatsApp number (digits); empty hides the WhatsApp button */
  whatsappNumber: string;
}) {
  const [s, action, pending] = useActionState(submitBulkEnquiry, initial);
  const v = (k: string, fallback = "") => s.values?.[k] ?? fallback;
  const e = s.errors ?? {};

  if (s.ok && s.reference) {
    const wa = whatsappLink(whatsappNumber, bulkEnquiryWhatsAppMessage(s.reference));
    return (
      <div role="status" className="rounded-card bg-white p-8 shadow-soft">
        <h2 className="font-serif text-3xl text-forest">Enquiry received</h2>
        <p className="mt-2 text-brown">Thank you! We will review your requirements and get back to you with a quotation.</p>
        <p className="mt-5 text-sm text-brown">Your reference number</p>
        <p className="font-serif text-3xl tracking-wide text-chocolate">{s.reference}</p>
        <p className="mt-1 text-xs text-brown">Please quote this number in any follow-up. A confirmation email is sent when email is configured.</p>
        {wa && (
          <a href={wa} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ size: "lg" }), "mt-6")}>
            Continue on WhatsApp
          </a>
        )}
      </div>
    );
  }

  return (
    <form action={action} className="space-y-8 rounded-card bg-white p-6 shadow-soft sm:p-8" noValidate>
      <FormMessage ok={s.ok} message={s.message} />

      <fieldset className="space-y-4">
        <legend className="font-serif text-2xl text-forest">Your details</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" name="fullName" autoComplete="name" required defaultValue={v("fullName", defaults.fullName)} error={e.fullName} />
          <Field label="Company name" name="companyName" autoComplete="organization" required defaultValue={v("companyName")} error={e.companyName} />
          <Field label="Business email" name="email" type="email" autoComplete="email" required defaultValue={v("email", defaults.email)} error={e.email} />
          <Field label="Phone number" name="phone" type="tel" autoComplete="tel" required defaultValue={v("phone", defaults.phone)} error={e.phone} />
          <Field label="WhatsApp number (optional)" name="whatsapp" type="tel" defaultValue={v("whatsapp")} hint="If different from your phone number" error={e.whatsapp} />
          <Field label="City / location" name="location" autoComplete="address-level2" required defaultValue={v("location")} error={e.location} />
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="font-serif text-2xl text-forest">What you need</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Cashew variety" name="variety" defaultValue={v("variety")} error={e.variety}>
            <option value="" disabled>Select a variety</option>
            {FORMS.map((f) => <option key={f} value={f}>{FORM_LABELS[f]}</option>)}
            <option value="OTHER">Other</option>
          </Select>
          <Select label="Grade" name="grade" defaultValue={v("grade")} error={e.grade}>
            <option value="" disabled>Select a grade</option>
            {GRADES.map((g) => <option key={g} value={g}>{GRADE_LABELS[g]}</option>)}
            <option value="ANY">Any / not sure</option>
          </Select>
          <Field label="Quantity required (kg)" name="quantityKg" type="number" inputMode="numeric" min={1} required defaultValue={v("quantityKg")} error={e.quantityKg} />
          <Select label="Packaging preference" name="packaging" defaultValue={v("packaging")} error={e.packaging}>
            <option value="" disabled>Select packaging</option>
            {Object.entries(PACKAGING_OPTIONS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
          </Select>
          <Field label="Expected delivery date (optional)" name="expectedDelivery" type="date" defaultValue={v("expectedDelivery")} error={e.expectedDelivery} />
        </div>
        <div>
          <label htmlFor="f-requirements" className="mb-1 block text-sm text-brown">Additional requirements (optional)</label>
          <textarea id="f-requirements" name="requirements" rows={4} maxLength={1000} defaultValue={v("requirements")}
            className="w-full rounded-lg border border-cashew bg-white px-3 py-2.5 text-sm text-chocolate" />
          {e.requirements && <p className="mt-1 text-xs text-red-700">{e.requirements}</p>}
        </div>
      </fieldset>

      {/* Honeypot – hidden from people and assistive tech */}
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />

      <div>
        <label className="flex items-start gap-2 text-sm text-chocolate">
          <input type="checkbox" name="consent" className="mt-1" defaultChecked={s.values?.consent === "on"} required />
          I agree that you may contact me about this enquiry using the details above. <Link href="/legal/privacy-policy" className="underline" target="_blank">Privacy Policy</Link>.
        </label>
        {e.consent && <p className="mt-1 text-xs text-red-700">{e.consent}</p>}
      </div>

      <Button type="submit" size="lg" disabled={pending}>{pending ? "Sending…" : "Request a quotation"}</Button>
    </form>
  );
}

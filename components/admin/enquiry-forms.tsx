"use client";

import { useActionState } from "react";
import { createQuotationAction, sendQuotationAction, setQuotationStatusAction, updateEnquiryAction } from "@/app/actions/admin/enquiries";
import { Button } from "@/components/ui/button";
import { Field, FormMessage } from "@/components/ui/field";
import { ENQUIRY_LABELS, ENQUIRY_STATUSES } from "@/lib/admin/enquiry-status";
import type { FormState } from "@/lib/validators/auth";

const initial: FormState = { ok: false };

export function EnquiryStatusForm({ id, status, adminNotes }: { id: string; status: string; adminNotes: string }) {
  const [s, action, pending] = useActionState(updateEnquiryAction, initial);
  return (
    <form action={action} className="space-y-3" noValidate>
      <input type="hidden" name="id" value={id} />
      <FormMessage ok={s.ok} message={s.message} />
      <div>
        <label htmlFor="enq-status" className="mb-1 block text-sm text-brown">Status</label>
        <select id="enq-status" name="status" defaultValue={status} className="w-full rounded-lg border border-cashew bg-white px-3 py-2.5 text-sm text-chocolate">
          {ENQUIRY_STATUSES.map((st) => <option key={st} value={st}>{ENQUIRY_LABELS[st]}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="enq-notes" className="mb-1 block text-sm text-brown">Internal notes (never shown to the buyer)</label>
        <textarea id="enq-notes" name="adminNotes" rows={4} maxLength={2000} defaultValue={adminNotes} className="w-full rounded-lg border border-cashew bg-white px-3 py-2.5 text-sm text-chocolate" />
        {s.errors?.adminNotes && <p className="mt-1 text-xs text-red-700">{s.errors.adminNotes}</p>}
      </div>
      <Button type="submit" size="sm" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
    </form>
  );
}

export function QuotationForm({ id, defaultQuantityKg }: { id: string; defaultQuantityKg: number }) {
  const [s, action, pending] = useActionState(createQuotationAction, initial);
  const e = s.errors ?? {};
  return (
    <form action={action} className="space-y-3" noValidate>
      <input type="hidden" name="id" value={id} />
      <FormMessage ok={s.ok} message={s.message} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Price per kg (₹)" name="pricePerKg" inputMode="decimal" error={e.pricePerKg} required />
        <Field label="Quantity (kg)" name="quantityKg" inputMode="numeric" defaultValue={String(defaultQuantityKg)} error={e.quantityKg} required />
      </div>
      <Field label="Valid until (optional)" name="validUntil" type="date" error={e.validUntil} />
      <div>
        <label htmlFor="q-terms" className="mb-1 block text-sm text-brown">Terms (payment, delivery, packaging…)</label>
        <textarea id="q-terms" name="terms" rows={3} maxLength={2000} className="w-full rounded-lg border border-cashew bg-white px-3 py-2.5 text-sm text-chocolate" />
        {e.terms && <p className="mt-1 text-xs text-red-700">{e.terms}</p>}
      </div>
      <div className="flex flex-wrap gap-3">
        <Button type="submit" name="intent" value="send" disabled={pending}>{pending ? "Working…" : "Send to buyer"}</Button>
        <Button type="submit" name="intent" value="draft" variant="outline" disabled={pending}>Save draft</Button>
      </div>
      <p className="text-xs text-brown">&quot;Send to buyer&quot; emails the quotation and marks the enquiry as quoted.</p>
    </form>
  );
}

export function SendDraftForm({ id, quotationId }: { id: string; quotationId: string }) {
  const [s, action, pending] = useActionState(sendQuotationAction, initial);
  return (
    <form action={action} className="space-y-1">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="quotationId" value={quotationId} />
      <FormMessage ok={s.ok} message={s.message} />
      <Button type="submit" size="sm" disabled={pending}>Send draft to buyer</Button>
    </form>
  );
}

export function QuotationOutcomeForm({ id, quotationId }: { id: string; quotationId: string }) {
  const [s, action, pending] = useActionState(setQuotationStatusAction, initial);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="quotationId" value={quotationId} />
      <FormMessage ok={s.ok} message={s.message} />
      {(["ACCEPTED", "REJECTED", "EXPIRED"] as const).map((st) => (
        <Button key={st} type="submit" name="status" value={st} size="sm" variant="ghost" disabled={pending}>Mark {st.toLowerCase()}</Button>
      ))}
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { saveAddress, updateProfile } from "@/app/actions/account";
import { Button } from "@/components/ui/button";
import { Field, FormMessage } from "@/components/ui/field";
import type { FormState } from "@/lib/validators/auth";

const initial: FormState = { ok: false };

export function ProfileForm({ fullName, phone, email }: { fullName: string; phone: string; email: string }) {
  const [s, action, pending] = useActionState(updateProfile, initial);
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage ok={s.ok} message={s.message} />
      <Field label="Email" name="email-display" value={email} readOnly disabled hint="Your sign-in email cannot be changed here." />
      <Field label="Full name" name="fullName" autoComplete="name" required defaultValue={s.values?.fullName ?? fullName} error={s.errors?.fullName} />
      <Field label="Mobile number" name="phone" type="tel" autoComplete="tel" defaultValue={s.values?.phone ?? phone} hint="10-digit Indian mobile number (optional)" error={s.errors?.phone} />
      <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save profile"}</Button>
    </form>
  );
}

type Addr = {
  id?: string; label?: string | null; fullName?: string; phone?: string; line1?: string; line2?: string | null;
  city?: string; state?: string; postalCode?: string; isDefault?: boolean;
};

export function AddressForm({ address, submitLabel }: { address?: Addr; submitLabel: string }) {
  const [s, action, pending] = useActionState(saveAddress, initial);
  const v = (k: keyof Addr) => s.values?.[k] ?? (address?.[k] as string | undefined) ?? "";
  const e = s.errors ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      {address?.id && <input type="hidden" name="id" value={address.id} />}
      <FormMessage ok={s.ok} message={s.message} />
      <Field label="Label (optional)" name="label" defaultValue={v("label")} placeholder="Home, Office…" error={e.label} />
      <Field label="Recipient name" name="fullName" autoComplete="name" required defaultValue={v("fullName")} error={e.fullName} />
      <Field label="Mobile number" name="phone" type="tel" autoComplete="tel" required defaultValue={v("phone")} error={e.phone} />
      <Field label="Address line 1" name="line1" autoComplete="address-line1" required defaultValue={v("line1")} error={e.line1} />
      <Field label="Address line 2 (optional)" name="line2" autoComplete="address-line2" defaultValue={v("line2")} error={e.line2} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="City" name="city" autoComplete="address-level2" required defaultValue={v("city")} error={e.city} />
        <Field label="State" name="state" autoComplete="address-level1" required defaultValue={v("state")} error={e.state} />
      </div>
      <Field label="PIN code" name="postalCode" inputMode="numeric" autoComplete="postal-code" required maxLength={6} defaultValue={v("postalCode")} error={e.postalCode} />
      <label className="flex items-center gap-2 text-sm text-chocolate">
        <input type="checkbox" name="isDefault" defaultChecked={address?.isDefault} /> Make this my default address
      </label>
      <Button type="submit" disabled={pending}>{pending ? "Saving…" : submitLabel}</Button>
    </form>
  );
}

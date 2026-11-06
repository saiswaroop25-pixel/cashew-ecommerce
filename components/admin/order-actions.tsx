"use client";

import { useActionState } from "react";
import { advanceOrderAction, cancelOrderAction, refundOrderAction, shipOrderAction, updateShipmentAction } from "@/app/actions/admin/orders";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { Button } from "@/components/ui/button";
import { Field, FormMessage } from "@/components/ui/field";
import type { FormState } from "@/lib/validators/auth";

const initial: FormState = { ok: false };

export function AdvanceForm({ id, to, label }: { id: string; to: "PROCESSING" | "DELIVERED"; label: string }) {
  const [s, action, pending] = useActionState(advanceOrderAction, initial);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="to" value={to} />
      <FormMessage ok={s.ok} message={s.message} />
      <Button type="submit" disabled={pending}>{pending ? "Updating…" : label}</Button>
    </form>
  );
}

export function ShipForm({ id, existing }: { id: string; existing?: { carrier: string; trackingNumber: string; trackingUrl: string } }) {
  const [s, action, pending] = useActionState(existing ? updateShipmentAction : shipOrderAction, initial);
  const e = s.errors ?? {};
  return (
    <form action={action} className="space-y-3" noValidate>
      <input type="hidden" name="id" value={id} />
      <FormMessage ok={s.ok} message={s.message} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Carrier" name="carrier" defaultValue={existing?.carrier} placeholder="e.g. Delhivery" error={e.carrier} required />
        <Field label="Tracking number" name="trackingNumber" defaultValue={existing?.trackingNumber} error={e.trackingNumber} required />
      </div>
      <Field label="Tracking link (optional)" name="trackingUrl" type="url" defaultValue={existing?.trackingUrl} placeholder="https://…" error={e.trackingUrl} />
      <Button type="submit" disabled={pending}>{pending ? "Saving…" : existing ? "Update shipment" : "Mark as shipped & email customer"}</Button>
    </form>
  );
}

export function CancelForm({ id, kind }: { id: string; kind: "release-stock" | "refund-and-restock" }) {
  const [s, action, pending] = useActionState(cancelOrderAction, initial);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="id" value={id} />
      <FormMessage ok={s.ok} message={s.message} />
      <ConfirmButton confirmLabel={kind === "refund-and-restock" ? "Yes, refund and cancel" : "Yes, cancel order"} disabled={pending}>
        {kind === "refund-and-restock" ? "Cancel & refund in full…" : "Cancel order…"}
      </ConfirmButton>
      <p className="text-xs text-brown">
        {kind === "refund-and-restock"
          ? "Refunds the whole payment through Razorpay and puts the items back in stock. If the refund fails, nothing changes."
          : "No payment was taken. This releases the stock being held for the order."}
      </p>
    </form>
  );
}

export function RefundForm({ id, remainingRupees }: { id: string; remainingRupees: string }) {
  const [s, action, pending] = useActionState(refundOrderAction, initial);
  return (
    <form action={action} className="space-y-3" noValidate>
      <input type="hidden" name="id" value={id} />
      <FormMessage ok={s.ok} message={s.message} />
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-44">
          <Field label="Refund amount (₹)" name="amount" inputMode="decimal" defaultValue={remainingRupees} error={s.errors?.amount} hint={`Up to ₹${remainingRupees}`} />
        </div>
        <ConfirmButton confirmLabel="Yes, refund this amount" disabled={pending}>Refund…</ConfirmButton>
      </div>
      <p className="text-xs text-brown">Sent to the customer&apos;s original payment method. Stock is not changed by a refund.</p>
    </form>
  );
}

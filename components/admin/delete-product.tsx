"use client";

import { useActionState } from "react";
import { deleteProductAction } from "@/app/actions/admin/products";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { FormMessage } from "@/components/ui/field";
import type { FormState } from "@/lib/validators/auth";

const initial: FormState = { ok: false };

export function DeleteProduct({ id }: { id: string }) {
  const [s, action, pending] = useActionState(deleteProductAction, initial);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <FormMessage ok={s.ok} message={s.message} />
      <ConfirmButton confirmLabel="Yes, delete permanently" disabled={pending}>Delete product…</ConfirmButton>
      <p className="text-xs text-brown">Only possible if nobody has ever ordered it. Otherwise hide it from the shop instead.</p>
    </form>
  );
}

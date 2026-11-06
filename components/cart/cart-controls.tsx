"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { useActionState, useTransition } from "react";
import { applyCoupon, removeCoupon, removeItem, updateQuantity, type CartActionState } from "@/app/actions/cart";
import { Button } from "@/components/ui/button";
import { MAX_QTY_PER_LINE } from "@/lib/pricing";

export function LineControls({ itemId, quantity, available, name }: { itemId: string; quantity: number; available: number; name: string }) {
  const [pending, start] = useTransition();
  const max = Math.min(MAX_QTY_PER_LINE, Math.max(available, quantity));
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center rounded-full border border-cashew bg-white" role="group" aria-label={`Quantity for ${name}`}>
        <button type="button" aria-label="Decrease quantity" disabled={pending || quantity <= 1} className="p-2 disabled:opacity-40"
          onClick={() => start(() => updateQuantity(itemId, quantity - 1))}>
          <Minus size={14} />
        </button>
        <span className="w-7 text-center text-sm" aria-live="polite">{quantity}</span>
        <button type="button" aria-label="Increase quantity" disabled={pending || quantity >= max} className="p-2 disabled:opacity-40"
          onClick={() => start(() => updateQuantity(itemId, quantity + 1))}>
          <Plus size={14} />
        </button>
      </div>
      <button type="button" aria-label={`Remove ${name} from cart`} disabled={pending}
        className="rounded-full p-2 text-brown hover:bg-cashew/50 disabled:opacity-40"
        onClick={() => start(() => removeItem(itemId))}>
        <Trash2 size={16} />
      </button>
    </div>
  );
}

const initial: CartActionState = { ok: false };

export function CouponForm({ applied }: { applied: { code: string; ok: boolean; reason?: string } | null }) {
  const [state, action, pending] = useActionState(applyCoupon, initial);
  const [removing, startRemove] = useTransition();

  if (applied) {
    return (
      <div className="space-y-1 text-sm">
        <p className="flex items-center justify-between">
          <span className="text-chocolate">Coupon <strong>{applied.code}</strong></span>
          <button type="button" className="text-forest underline disabled:opacity-50" disabled={removing}
            onClick={() => startRemove(() => removeCoupon())}>
            Remove
          </button>
        </p>
        {!applied.ok && <p role="alert" className="text-xs text-red-700">{applied.reason}</p>}
      </div>
    );
  }
  return (
    <form action={action} className="space-y-2" noValidate>
      <label htmlFor="coupon" className="text-sm text-brown">Have a coupon?</label>
      <div className="flex gap-2">
        <input id="coupon" name="code" autoComplete="off" maxLength={30} placeholder="Enter code"
          className="w-full rounded-lg border border-cashew bg-white px-3 py-2 text-sm uppercase text-chocolate" />
        <Button type="submit" size="sm" variant="outline" disabled={pending}>Apply</Button>
      </div>
      {/* Success is shown by the applied-coupon row, so only errors need a message here. */}
      {state.message && !state.ok && <p role="alert" className="text-xs text-red-700">{state.message}</p>}
    </form>
  );
}

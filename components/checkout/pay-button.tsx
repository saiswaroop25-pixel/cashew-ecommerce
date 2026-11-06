"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { confirmPayment, startPayment } from "@/app/actions/payment";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/utils";

type RazorpaySuccess = { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string };
type RazorpayFailure = { error?: { description?: string } };
type RazorpayInstance = { open(): void; on(event: "payment.failed", cb: (r: RazorpayFailure) => void): void };
type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description: string;
  prefill: { name: string; email: string; contact: string };
  theme: { color: string };
  handler: (r: RazorpaySuccess) => void;
  modal: { ondismiss: () => void };
};
declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

const SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

function loadRazorpay(): Promise<boolean> {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export function PayButton({ orderId, token, totalPaise, siteName }: { orderId: string; token: string | null; totalPaise: number; siteName: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "opening" | "open" | "verifying">("idle");
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    setError(null);
    setState("opening");

    const started = await startPayment(orderId, token);
    if (!started.ok) {
      setError(started.message);
      setState("idle");
      return;
    }
    if (!(await loadRazorpay()) || !window.Razorpay) {
      setError("Could not load the payment window. Check your connection and try again.");
      setState("idle");
      return;
    }

    const p = started.params;
    const rz = new window.Razorpay({
      key: p.keyId,
      amount: p.amountPaise,
      currency: p.currency,
      order_id: p.razorpayOrderId,
      name: siteName,
      description: `Order ${p.orderNumber}`,
      prefill: p.prefill,
      theme: { color: "#344B35" },
      handler: async (response) => {
        setState("verifying");
        const result = await confirmPayment(orderId, token, response);
        if (result.ok) {
          router.refresh(); // the page re-renders in its "paid" state
        } else {
          setError(result.message ?? "We could not confirm your payment.");
          setState("idle");
        }
      },
      modal: { ondismiss: () => setState((s) => (s === "verifying" ? s : "idle")) },
    });
    rz.on("payment.failed", (r) => {
      setError(r.error?.description ? `Payment failed: ${r.error.description}. You can try again.` : "Payment failed. You can try again.");
      setState("idle");
    });
    setState("open");
    rz.open();
  }

  const busy = state !== "idle";
  return (
    <div className="space-y-3">
      <Button type="button" size="lg" className="w-full sm:w-auto" disabled={busy} onClick={pay}>
        {state === "verifying" ? "Confirming payment…" : state === "idle" ? `Pay ${formatINR(totalPaise)} securely` : "Opening payment…"}
      </Button>
      <p className="text-xs text-brown">Payments are processed by Razorpay (UPI, cards, netbanking, wallets). We never see or store your card details.</p>
      <p role="alert" className="min-h-5 text-sm text-red-700">{error}</p>
    </div>
  );
}

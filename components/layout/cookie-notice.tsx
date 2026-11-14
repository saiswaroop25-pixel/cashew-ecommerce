"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

const KEY = "cookie-notice";

/**
 * Tells visitors what cookies the shop uses. It sets only the essential ones (cart and sign-in) and no tracking, so
 * there is nothing to switch on or off: one clear button, no pre-ticked boxes, no nagging. The choice is remembered
 * in this browser only (localStorage), never sent to us. If storage is blocked the notice simply shows each visit.
 */
const listeners = new Set<() => void>();
const read = () => {
  try {
    return window.localStorage.getItem(KEY) === "ok";
  } catch {
    return false;
  }
};
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => void listeners.delete(cb);
};

export function CookieNotice() {
  // Server and first client render both say "dismissed", so nothing flashes or mismatches; the real value follows.
  const dismissed = useSyncExternalStore(subscribe, read, () => true);
  if (dismissed) return null;

  const accept = () => {
    try {
      window.localStorage.setItem(KEY, "ok");
    } catch {
      /* storage blocked: the notice will show again next visit */
    }
    listeners.forEach((l) => l());
  };

  return (
    <section
      aria-label="Cookie notice"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-cashew bg-white px-4 py-4 shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.25)] sm:px-6"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-chocolate">
          We use only the cookies this shop needs to work: your cart and, if you sign in, your session. No advertising or tracking.{" "}
          <Link href="/legal/cookie-policy" className="underline">Cookie Policy</Link>
        </p>
        <button
          type="button"
          onClick={accept}
          className="shrink-0 rounded-full bg-forest px-6 py-2.5 text-sm font-medium text-cream hover:bg-forest/90"
        >
          Got it
        </button>
      </div>
    </section>
  );
}

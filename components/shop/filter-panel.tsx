"use client";

import { SlidersHorizontal } from "lucide-react";
import { useState } from "react";

/**
 * Collapsible filter fields on small screens (always visible from `lg`).
 * The fields are server-rendered children inside the parent <form>, so
 * submitting works the same whether the panel is open or closed.
 */
export function FilterPanel({ children, activeCount }: { children: React.ReactNode; activeCount: number }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="filter-fields"
        className="flex w-full items-center justify-between rounded-lg border border-cashew px-3 py-2 text-sm text-chocolate lg:hidden"
      >
        <span className="flex items-center gap-2">
          <SlidersHorizontal size={16} aria-hidden /> Filters &amp; sorting
        </span>
        {activeCount > 0 && (
          <span className="rounded-full bg-forest px-2 py-0.5 text-xs text-cream">{activeCount}</span>
        )}
      </button>
      <div id="filter-fields" className={`${open ? "block" : "hidden"} space-y-4 lg:block`}>
        {children}
      </div>
    </>
  );
}

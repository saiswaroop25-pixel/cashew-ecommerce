"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useRef } from "react";
import { cn } from "@/lib/utils";
import type { FlowStep } from "@/services/manufacturing";

/**
 * Picture-led process flow: numbered cards left to right with arrows between them, so a visitor
 * can follow how cashews get from the tree to the pack. Scrolls sideways with touch, trackpad,
 * the scrollbar or the arrow buttons.
 */
export function ProcessFlow({ steps }: { steps: FlowStep[] }) {
  const strip = useRef<HTMLOListElement>(null);
  const scroll = (dir: 1 | -1) => strip.current?.scrollBy({ left: dir * 320, behavior: "smooth" });

  if (steps.length === 0) return null;
  return (
    <div>
      <div className="mb-3 flex justify-end gap-2">
        <button type="button" onClick={() => scroll(-1)} aria-label="Previous steps" className="rounded-full border border-cashew bg-white p-2 text-forest hover:border-forest">
          <ChevronLeft size={18} aria-hidden />
        </button>
        <button type="button" onClick={() => scroll(1)} aria-label="Next steps" className="rounded-full border border-cashew bg-white p-2 text-forest hover:border-forest">
          <ChevronRight size={18} aria-hidden />
        </button>
      </div>

      <ol ref={strip} tabIndex={0} className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4" aria-label="Steps from cashew fruit to finished pack (scroll sideways with the arrow keys)">
        {steps.map((s, i) => (
          <li key={s.id} className="relative w-64 shrink-0 snap-start sm:w-72">
            <article className="h-full overflow-hidden rounded-card bg-white shadow-soft">
              <div className="relative aspect-[4/3]">
                {s.imageUrl ? (
                  <Image src={s.imageUrl} alt={s.imageAlt} fill sizes="288px" className="object-cover" />
                ) : (
                  // No picture yet: a calm brand-coloured tile instead of an "image missing" box
                  <div aria-hidden className="flex h-full items-center justify-center bg-gradient-to-br from-cashew to-cream">
                    <span className="font-serif text-6xl text-gold/70">{String(s.step).padStart(2, "0")}</span>
                  </div>
                )}
                <span className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-forest text-sm text-cream shadow-soft">{s.step}</span>
                {s.imageUrl && s.imageIsIllustrative && (
                  <span className="absolute bottom-2 right-2 rounded-full bg-chocolate/70 px-2 py-0.5 text-[10px] text-cream">Illustrative</span>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-serif text-lg leading-snug text-chocolate">{s.title}</h3>
                <p className="mt-1 text-sm text-brown">{s.summary}</p>
              </div>
            </article>
            {i < steps.length - 1 && (
              <span aria-hidden className={cn("absolute -right-4 top-[7.5rem] z-10 hidden h-7 w-7 items-center justify-center rounded-full bg-gold text-chocolate shadow-soft sm:flex")}>
                <ChevronRight size={16} />
              </span>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

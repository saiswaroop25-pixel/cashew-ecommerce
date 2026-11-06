"use client";

import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Photo = { url: string; alt: string };

/**
 * Product photo gallery: large main photo, thumbnails, and a click-to-zoom lightbox.
 * The lightbox uses the native <dialog> element, which gives focus trapping, Esc-to-close and
 * correct screen-reader behaviour without extra code.
 */
export function ProductGallery({ photos, productName }: { photos: Photo[]; productName: string }) {
  const [index, setIndex] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);

  if (photos.length === 0) {
    return <div className="flex aspect-square items-center justify-center rounded-card bg-cashew/40 text-brown/60">Image coming soon</div>;
  }
  const current = photos[Math.min(index, photos.length - 1)];
  const step = (d: number) => setIndex((i) => (i + d + photos.length) % photos.length);

  return (
    <div>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        aria-label={`Zoom photo: ${current.alt}`}
        className="group relative block aspect-square w-full cursor-zoom-in overflow-hidden rounded-card bg-cashew/40"
      >
        <Image src={current.url} alt={current.alt} fill priority sizes="(min-width: 768px) 50vw, 100vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
        <span className="absolute bottom-3 right-3 rounded-full bg-cream/90 p-2 text-forest shadow-soft" aria-hidden><Expand size={16} /></span>
      </button>

      {photos.length > 1 && (
        <ul className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label={`${productName} photos`}>
          {photos.map((p, i) => (
            <li key={p.url}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show photo ${i + 1} of ${photos.length}`}
                aria-current={i === index ? "true" : undefined}
                className={cn("relative h-16 w-16 overflow-hidden rounded-lg border-2 bg-cashew/40", i === index ? "border-forest" : "border-transparent hover:border-gold")}
              >
                <Image src={p.url} alt="" fill sizes="64px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <dialog
        ref={dialogRef}
        aria-label={`Zoomed photo of ${productName}`}
        className="m-auto h-[90vh] w-[92vw] max-w-5xl overflow-hidden rounded-card bg-chocolate p-0 backdrop:bg-chocolate/80"
        onClick={(e) => {
          if (e.target === dialogRef.current) dialogRef.current?.close(); // click on the dark backdrop closes
        }}
      >
        <div className="relative h-full w-full">
          <Image src={current.url} alt={current.alt} fill sizes="92vw" className="object-contain" />
          <button type="button" onClick={() => dialogRef.current?.close()} aria-label="Close zoom" className="absolute right-3 top-3 rounded-full bg-cream/90 p-2 text-forest">
            <X size={18} aria-hidden />
          </button>
          {photos.length > 1 && (
            <>
              <button type="button" onClick={() => step(-1)} aria-label="Previous photo" className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-cream/90 p-2 text-forest"><ChevronLeft size={20} aria-hidden /></button>
              <button type="button" onClick={() => step(1)} aria-label="Next photo" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-cream/90 p-2 text-forest"><ChevronRight size={20} aria-hidden /></button>
            </>
          )}
        </div>
      </dialog>
    </div>
  );
}

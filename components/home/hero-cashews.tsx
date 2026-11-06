import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Hero artwork: one large photograph of cashew kernels in a basket, in a soft rounded frame.
 * Server-rendered, no JavaScript. The frame has a fixed square aspect ratio so nothing shifts while the image loads.
 * The photo slowly zooms in and out; that is switched off for visitors who prefer reduced motion (see `.hero-zoom`
 * in globals.css).
 */
export function HeroCashews({ className }: { className?: string }) {
  return (
    <div className={cn("relative aspect-square w-full", className)}>
      <div className="absolute inset-0 overflow-hidden rounded-[2rem] shadow-[0_24px_60px_-20px_rgba(52,75,53,0.35)] ring-1 ring-gold/30">
        <Image
          src="/media/hero/basket.webp"
          alt="A woven basket filled with whole, creamy-white cashew kernels"
          width={862}
          height={862}
          sizes="(min-width: 768px) 560px, 92vw"
          priority
          className="hero-zoom h-full w-full object-cover"
        />
      </div>
    </div>
  );
}

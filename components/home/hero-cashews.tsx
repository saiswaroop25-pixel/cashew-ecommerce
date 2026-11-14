import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Hero photograph: whole cashew kernels in a basket, filling its half of the hero edge to edge.
 * Server-rendered, no JavaScript. The box has a fixed shape (square on phones, full height beside the text on
 * wider screens) so nothing shifts while the image loads. The photo slowly zooms; that is switched off for visitors
 * who prefer reduced motion (see `.hero-zoom` in globals.css).
 */
export function HeroCashews({ className }: { className?: string }) {
  return (
    <div className={cn("relative aspect-square w-full overflow-hidden md:aspect-auto md:min-h-[34rem]", className)}>
      <Image
        src="/media/hero/basket.webp"
        alt="A woven basket filled with whole, creamy-white cashew kernels"
        fill
        sizes="(min-width: 768px) 50vw, 100vw"
        priority
        className="hero-zoom object-cover"
      />
    </div>
  );
}

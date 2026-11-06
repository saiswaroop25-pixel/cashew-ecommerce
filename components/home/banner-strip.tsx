import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { PublicBanner } from "@/services/banners";

/** Admin-managed highlights at the top of the home page (offers, announcements, new arrivals). */
export function BannerStrip({ banners }: { banners: PublicBanner[] }) {
  if (banners.length === 0) return null;
  return (
    <section aria-label="Announcements" className="bg-forest text-cream">
      <ul className="mx-auto w-full max-w-7xl divide-y divide-cream/15 px-4 sm:px-6">
        {banners.map((b) => {
          const external = !!b.linkUrl && /^https:\/\//i.test(b.linkUrl);
          const cta = b.linkUrl && b.linkLabel ? (
            external ? (
              <a href={b.linkUrl} target="_blank" rel="noopener noreferrer" className="rounded-full bg-gold px-4 py-1.5 text-sm text-chocolate hover:bg-gold/85">{b.linkLabel}</a>
            ) : (
              <Link href={b.linkUrl} className="rounded-full bg-gold px-4 py-1.5 text-sm text-chocolate hover:bg-gold/85">{b.linkLabel}</Link>
            )
          ) : null;
          return (
            <li key={b.id} className={cn("flex flex-wrap items-center gap-x-4 gap-y-2 py-3")}>
              {b.imageUrl && (
                <span className="relative h-12 w-16 shrink-0 overflow-hidden rounded-lg">
                  <Image src={b.imageUrl} alt="" fill sizes="64px" className="object-cover" />
                </span>
              )}
              <p className="min-w-0 flex-1 text-sm">
                <strong className="font-serif text-base">{b.title}</strong>
                {b.subtitle && <span className="ml-2 text-cream/80">{b.subtitle}</span>}
              </p>
              {cta}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

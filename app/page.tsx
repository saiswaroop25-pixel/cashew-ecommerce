import Link from "next/link";
import { site } from "@/lib/site";

// Phase 0 placeholder. Replaces the create-next-app starter page; the real
// homepage is built in the frontend phase.
export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center px-4">
      <div className="max-w-xl text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-gold">Coming soon</p>
        <h1 className="mt-4 font-serif text-5xl text-forest">{site.name}</h1>
        <p className="mt-4 text-brown">
          Foundation is in place. The storefront is under construction.
        </p>
        <Link href="/shop" className="mt-6 inline-block rounded-full bg-forest px-6 py-3 text-cream">
          Browse the demo catalogue
        </Link>
      </div>
    </main>
  );
}

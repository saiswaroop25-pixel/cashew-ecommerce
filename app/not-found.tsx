import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <p className="text-xs uppercase tracking-[0.3em] text-gold-text">Error 404</p>
      <h1 className="mt-3 font-serif text-4xl text-forest">We could not find that page</h1>
      <p className="mt-4 text-brown">The link may be old or mistyped. Here are some good places to go instead.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/shop" className={cn(buttonVariants())}>Browse the shop</Link>
        <Link href="/" className={cn(buttonVariants({ variant: "outline" }))}>Home page</Link>
        <Link href="/bulk-orders" className={cn(buttonVariants({ variant: "outline" }))}>Bulk orders</Link>
      </div>
    </main>
  );
}

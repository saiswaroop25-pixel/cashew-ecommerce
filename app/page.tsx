import Link from "next/link";
import { Suspense } from "react";
import { NewsletterForm } from "@/components/home/newsletter-form";
import { ProductCard } from "@/components/shop/product-card";
import { LinkButton, buttonVariants } from "@/components/ui/button";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";
import { bulkEnquiryWhatsAppMessage, whatsappLink } from "@/lib/whatsapp";
import { listFeaturedProducts } from "@/services/catalog";
import { getManufacturingStages, getNutritionHighlights } from "@/services/home";

const container = "mx-auto w-full max-w-7xl px-4 sm:px-6";

export default function Home() {
  return (
    <main>
      <Hero />
      <Section title="Featured cashews" eyebrow="Popular choices">
        <Suspense fallback={<Skeleton />}>
          <Featured />
        </Suspense>
      </Section>
      <WhyChooseUs />
      <Section title="From fruit to finished pack" eyebrow="Our process">
        <Suspense fallback={<Skeleton />}>
          <Process />
        </Suspense>
      </Section>
      <Suspense fallback={null}>
        <Nutrition />
      </Suspense>
      <BulkOrders />
      <Newsletter />
    </main>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-cream">
      {/* Decorative shapes only; the 3D cashew scene replaces this in the 3D phase. */}
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-[28rem] w-[28rem] rounded-full bg-cashew/70" />
      <div aria-hidden className="pointer-events-none absolute right-24 top-40 h-56 w-56 rounded-full bg-gold/30" />
      <div className={cn(container, "relative grid items-center gap-10 py-20 md:grid-cols-2 md:py-32")}>
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-gold">Premium cashews</p>
          <h1 className="mt-4 font-serif text-5xl leading-[1.1] text-forest md:text-6xl">
            Cashews, chosen with care.
          </h1>
          <p className="mt-6 max-w-lg text-lg text-brown">
            Whole, roasted and salted cashews in a range of grades, for your kitchen or your business.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <LinkButton href="/shop" size="lg">Shop now</LinkButton>
            <LinkButton href="/bulk-orders" variant="outline" size="lg">Explore bulk orders</LinkButton>
          </div>
        </div>
      </div>
    </section>
  );
}

function Section({
  title,
  eyebrow,
  children,
  className,
}: {
  title: string;
  eyebrow: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn(container, "py-16", className)}>
      <p className="text-xs uppercase tracking-[0.3em] text-gold">{eyebrow}</p>
      <h2 className="mt-2 font-serif text-3xl text-forest md:text-4xl">{title}</h2>
      <div className="mt-8">{children}</div>
    </section>
  );
}

function Skeleton() {
  return <div className="h-48 animate-pulse rounded-card bg-cashew/40" aria-hidden />;
}

async function Featured() {
  const products = await listFeaturedProducts(4);
  if (products.length === 0) return <p className="text-brown">Featured products will appear here.</p>;
  return (
    <>
      <ul className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
        {products.map((p) => (
          <li key={p.id}><ProductCard product={p} /></li>
        ))}
      </ul>
      <div className="mt-8">
        <LinkButton href="/shop" variant="outline">View all products</LinkButton>
      </div>
    </>
  );
}

// Business strengths must be substantiated, so these are placeholders until real details exist.
const strengths = ["Product quality", "Freshness", "Quality control", "Packaging standards", "Sourcing practices", "Customer service"];

function WhyChooseUs() {
  return (
    <section className="bg-white py-16">
      <div className={container}>
        <p className="text-xs uppercase tracking-[0.3em] text-gold">Why choose us</p>
        <h2 className="mt-2 font-serif text-3xl text-forest md:text-4xl">What we stand for</h2>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {strengths.map((s) => (
            <li key={s} className="rounded-card border border-cashew p-6">
              <h3 className="font-serif text-xl text-chocolate">{s}</h3>
              <p className="mt-2 text-sm text-brown/80">
                Placeholder – the business will add verified details here.
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

async function Process() {
  const stages = await getManufacturingStages();
  if (stages.length === 0) return null;
  return (
    <>
      <ol className="flex snap-x gap-4 overflow-x-auto pb-4">
        {stages.map((s) => (
          <li key={s.step} className="w-56 shrink-0 snap-start rounded-card bg-white p-5 shadow-soft">
            <span className="font-serif text-2xl text-gold">{String(s.step).padStart(2, "0")}</span>
            <h3 className="mt-2 font-serif text-lg leading-snug text-chocolate">{s.title}</h3>
            <p className="mt-2 text-sm text-brown">{s.summary}</p>
          </li>
        ))}
      </ol>
      {stages.some((s) => s.isDemo) && (
        <p className="mt-2 text-xs text-brown/70">
          General description of cashew processing (demo text) – not a description of our own facility.
        </p>
      )}
      <div className="mt-6">
        <LinkButton href="/process" variant="outline">Explore the complete process</LinkButton>
      </div>
    </>
  );
}

async function Nutrition() {
  const n = await getNutritionHighlights();
  if (!n) return null;
  return (
    <Section title="Nutritional highlights" eyebrow="Good to know" className="pt-0">
      <ul className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {n.values.map((v) => (
          <li key={v.key} className="rounded-card bg-forest p-6 text-cream">
            <p className="font-serif text-3xl">
              {v.amount}
              <span className="ml-1 text-base text-cream/70">{v.unit}</span>
            </p>
            <p className="mt-1 text-sm text-cream/80">{v.label}</p>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-brown">
        Per {n.basisGrams} g of raw cashews. Source ({n.sourceType.toLowerCase().replace("_", " ")}): {n.sourceNote}
      </p>
      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <Link href="/nutrition" className="text-forest underline">Explore the nutrition dashboard</Link>
        <Link href={`/products/${n.productSlug}`} className="text-forest underline">See it on a product page</Link>
      </div>
    </Section>
  );
}

function BulkOrders() {
  const wa = whatsappLink(site.whatsappNumber, bulkEnquiryWhatsAppMessage());
  return (
    <section id="bulk" className="scroll-mt-20 bg-cashew/50 py-16">
      <div className={cn(container, "grid items-center gap-8 md:grid-cols-2")}>
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-gold">Wholesale &amp; bulk</p>
          <h2 className="mt-2 font-serif text-3xl text-forest md:text-4xl">Buying in volume?</h2>
          <p className="mt-4 text-brown">
            Distributors, retailers, hotels and restaurants can request a quotation for bulk quantities and custom packaging.
          </p>
        </div>
        <div className="flex flex-wrap gap-4 md:justify-end">
          <LinkButton href="/bulk-orders" size="lg">Request a quotation</LinkButton>
          {wa && (
            <a href={wa} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "outline", size: "lg" })}>
              Enquire on WhatsApp
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

function Newsletter() {
  return (
    <section className="bg-forest py-16 text-cream">
      <div className={cn(container, "flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between")}>
        <div>
          <h2 className="font-serif text-3xl">Stay in the loop</h2>
          <p className="mt-2 text-cream/80">News and offers, occasionally. Unsubscribe any time.</p>
        </div>
        <NewsletterForm />
      </div>
    </section>
  );
}

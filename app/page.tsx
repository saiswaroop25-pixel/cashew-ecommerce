import type { Metadata } from "next";
import { Suspense } from "react";
import { BannerStrip } from "@/components/home/banner-strip";
import { NewsletterForm } from "@/components/home/newsletter-form";
import { ProcessFlow } from "@/components/home/process-flow";
import { HeroCashews } from "@/components/home/hero-cashews";
import { ProductCard } from "@/components/shop/product-card";
import { LinkButton, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { bulkEnquiryWhatsAppMessage, whatsappLink } from "@/lib/whatsapp";
import { listFeaturedProducts } from "@/services/catalog";
import { getActiveBanners } from "@/services/banners";
import { getProcessFlow } from "@/services/manufacturing";
import { getSite } from "@/services/site";

export const metadata: Metadata = {
  description: "Whole, roasted and salted cashews in a range of grades, for your kitchen or your business. Shop online or request a bulk quotation.",
  alternates: { canonical: "/" },
};

const container = "mx-auto w-full max-w-7xl px-4 sm:px-6";

export default function Home() {
  return (
    <main>
      <Suspense fallback={null}>
        <Banners />
      </Suspense>
      <Hero />
      <Section title="Start with these" eyebrow="From the shop">
        <Suspense fallback={<Skeleton />}>
          <Featured />
        </Suspense>
      </Section>
      <GradeGuide />
      <section id="process" className="scroll-mt-20 bg-white py-16">
        <div className={container}>
          <p className="text-xs uppercase tracking-[0.3em] text-gold-text">Our process</p>
          <h2 className="mt-2 font-serif text-3xl text-forest md:text-4xl">How a cashew gets to you</h2>
          <div className="mt-8">
            <Suspense fallback={<Skeleton />}>
              <Process />
            </Suspense>
          </div>
        </div>
      </section>
      <Suspense fallback={null}>
        <BulkOrders />
      </Suspense>
      <Newsletter />
    </main>
  );
}

async function Banners() {
  return <BannerStrip banners={await getActiveBanners()} />;
}

function Hero() {
  return (
    <section className="bg-forest text-cream">
      <div className="mx-auto grid w-full max-w-7xl md:grid-cols-[1.05fr_1fr]">
        <div className="flex flex-col justify-center px-4 py-14 sm:px-6 md:py-24 md:pr-12">
          <p className="text-xs uppercase tracking-[0.3em] text-cashew">Whole · Roasted · Salted · Broken</p>
          <h1 className="mt-5 font-serif text-5xl leading-[1.05] md:text-7xl">
            Cashews,
            <br />
            sold by the grade.
          </h1>
          <p className="mt-6 max-w-md text-lg text-cream/80">
            Pick a grade, pick a pack size, and know exactly what arrives. Buying for a business? Ask for a bulk quotation.
          </p>
          <div className="mt-9 flex flex-wrap gap-4">
            <LinkButton href="/shop" variant="gold" size="lg">Shop cashews</LinkButton>
            <a href="#grades" className="inline-flex items-center px-2 py-4 text-base text-cream underline decoration-gold decoration-2 underline-offset-8 hover:text-gold">
              How grades work
            </a>
          </div>
        </div>
        <HeroCashews />
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
      <p className="text-xs uppercase tracking-[0.3em] text-gold-text">{eyebrow}</p>
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
      <ul className={cn("grid grid-cols-2 gap-4 sm:gap-6", products.length === 3 ? "sm:grid-cols-3" : "lg:grid-cols-4")}>
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

// Standard trade meaning of the "W" (whole) grades: the number is roughly how many kernels make up a pound.
const grades = [
  { code: "W180", count: 180, note: "The largest whole kernels. Good for gifting and eating on their own." },
  { code: "W240", count: 240, note: "The all-rounder: large, even kernels for snacking and cooking." },
  { code: "W320", count: 320, note: "Smaller whole kernels at a lower price, good for everyday use." },
];

function GradeGuide() {
  return (
    <section id="grades" className="scroll-mt-20 bg-white py-20">
      <div className={cn(container, "grid gap-12 md:grid-cols-[0.8fr_1.2fr]")}>
        <div className="md:sticky md:top-28 md:self-start">
          <p className="text-xs uppercase tracking-[0.3em] text-gold-text">Reading a grade</p>
          <h2 className="mt-3 font-serif text-4xl leading-tight text-forest md:text-5xl">The number is the size.</h2>
          <p className="mt-5 max-w-sm text-brown">
            Whole cashews are graded by how many kernels it takes to make a pound. A lower number means bigger kernels, so
            W180 is larger than W320. Broken pieces are sold separately for cooking and baking.
          </p>
          <LinkButton href="/shop" variant="outline" className="mt-7">See every grade in the shop</LinkButton>
        </div>
        <ol className="divide-y divide-cashew border-y border-cashew">
          {grades.map((g) => (
            <li key={g.code} className="grid grid-cols-[5.5rem_1fr] items-center gap-5 py-6 sm:grid-cols-[7rem_1fr_9rem]">
              <span className="font-serif text-3xl text-forest sm:text-4xl">{g.code}</span>
              <p className="text-sm text-brown">{g.note}</p>
              <div className="col-span-2 sm:col-span-1" aria-label={`About ${g.count} kernels per pound`}>
                <div className="h-1.5 w-full rounded-full bg-cashew">
                  <div className="h-1.5 rounded-full bg-gold" style={{ width: `${Math.round((180 / g.count) * 100)}%` }} />
                </div>
                <p className="mt-1.5 text-xs text-brown">about {g.count} per pound</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

async function Process() {
  const all = await getProcessFlow();
  // Only steps that have a picture, so the strip never shows empty tiles.
  const steps = all.filter((s) => s.imageUrl).map((s, i) => ({ ...s, step: i + 1 }));
  if (steps.length === 0) return null;
  return (
    <>
      <p className="mb-4 max-w-2xl text-brown">A cashew grows outside its fruit and takes many steps to become a kernel you can eat.</p>
      <ProcessFlow steps={steps} />
      {steps.some((s) => s.isDemo) && (
        <p className="mt-2 text-xs text-brown">
          A general description of how cashews are processed, shown with illustrative photographs.
        </p>
      )}
    </>
  );
}

async function BulkOrders() {
  const site = await getSite();
  const wa = whatsappLink(site.whatsapp, bulkEnquiryWhatsAppMessage());
  return (
    <section id="bulk" className="scroll-mt-20 bg-cashew/50 py-16">
      <div className={cn(container, "grid items-center gap-8 md:grid-cols-2")}>
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-gold-text">Wholesale &amp; bulk</p>
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

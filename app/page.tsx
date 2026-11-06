import { Suspense } from "react";
import { BannerStrip } from "@/components/home/banner-strip";
import { NewsletterForm } from "@/components/home/newsletter-form";
import { ProcessFlow } from "@/components/home/process-flow";
import { Scene3D } from "@/components/three/scene-3d";
import { ProductCard } from "@/components/shop/product-card";
import { LinkButton, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { bulkEnquiryWhatsAppMessage, whatsappLink } from "@/lib/whatsapp";
import { listFeaturedProducts } from "@/services/catalog";
import { getActiveBanners } from "@/services/banners";
import { getProcessFlow } from "@/services/manufacturing";
import { getSite } from "@/services/site";

const container = "mx-auto w-full max-w-7xl px-4 sm:px-6";

export default function Home() {
  return (
    <main>
      <Suspense fallback={null}>
        <Banners />
      </Suspense>
      <Hero />
      <Section title="Featured cashews" eyebrow="Popular choices">
        <Suspense fallback={<Skeleton />}>
          <Featured />
        </Suspense>
      </Section>
      <WhyChooseUs />
      <section id="process" className="scroll-mt-20 bg-white py-16">
        <div className={container}>
          <p className="text-xs uppercase tracking-[0.3em] text-gold">Our process</p>
          <h2 className="mt-2 font-serif text-3xl text-forest md:text-4xl">From fruit to finished pack</h2>
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
    <section className="relative overflow-hidden bg-cream">
      {/* Soft decorative shapes behind the 3D scene */}
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-[28rem] w-[28rem] rounded-full bg-cashew/70" />
      <div aria-hidden className="pointer-events-none absolute right-24 top-40 h-56 w-56 rounded-full bg-gold/30" />
      <div className={cn(container, "relative grid items-center gap-6 py-14 md:grid-cols-2 md:py-24")}>
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
        {/* Decorative 3D scene; the static illustration shows first and for reduced-motion / low-power visitors */}
        <Scene3D variant="hero" className="aspect-[4/3] w-full md:aspect-square" />
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
  const steps = await getProcessFlow();
  if (steps.length === 0) return null;
  return (
    <>
      <p className="mb-4 max-w-2xl text-brown">Follow the journey from the tree to the sealed pack, step by step.</p>
      <ProcessFlow steps={steps} />
      {steps.some((s) => s.isDemo) && (
        <p className="mt-2 text-xs text-brown/70">
          General description of how cashews are processed (placeholder wording) – not a description of our own facility.
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

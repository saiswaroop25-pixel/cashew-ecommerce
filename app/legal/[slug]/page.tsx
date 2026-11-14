import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { legalPages } from "@/lib/legal";
import { POLICY_TERMS, getPolicy } from "@/lib/policies";
import { getSite } from "@/services/site";

export function generateStaticParams() {
  return legalPages.map((p) => ({ slug: p.slug }));
}

type Params = Promise<{ slug: string }>;

const DESCRIPTIONS: Record<string, string> = {
  "privacy-policy": "What personal data this shop collects, why, who handles it and how to control it.",
  terms: "The terms for using this website and buying cashews from us.",
  "returns-policy": "When you get a refund or replacement, how to report a problem and how refunds are paid.",
  "shipping-policy": "Delivery charges, dispatch and delivery times.",
  "cookie-policy": "The few cookies this shop uses, and what they do.",
  "photo-credits": "Licences and credits for the pictures and fonts used on this site.",
};

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const page = legalPages.find((p) => p.slug === slug);
  return page ? { title: page.title, description: DESCRIPTIONS[slug], alternates: { canonical: `/legal/${slug}` } } : {};
}

// Unknown /legal/* addresses never reach here: proxy.ts answers them with a real 404 first.
export default function LegalPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={null}>
      <LegalBody params={params} />
    </Suspense>
  );
}

async function LegalBody({ params }: { params: Params }) {
  const { slug } = await params;
  const page = legalPages.find((p) => p.slug === slug);
  if (!page) notFound();
  const site = await getSite();
  const policy = getPolicy(page.slug, site);
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="font-serif text-4xl text-forest">{page.title}</h1>
      <p className="mt-2 text-sm text-brown">Last updated {POLICY_TERMS.lastUpdated}</p>
      {policy.intro && <p className="mt-6 text-lg text-chocolate">{policy.intro}</p>}
      <div className="mt-8 space-y-8 text-chocolate">
        {policy.sections.map((s) => (
          <section key={s.heading} aria-labelledby={`h-${s.heading.replace(/\W+/g, "-")}`}>
            <h2 id={`h-${s.heading.replace(/\W+/g, "-")}`} className="font-serif text-2xl text-forest">{s.heading}</h2>
            {s.paragraphs?.map((t) => (
              <p key={t} className="mt-3">{t}</p>
            ))}
            {s.bullets && (
              <ul className="mt-3 list-disc space-y-2 pl-5">
                {s.bullets.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
      <p className="mt-10 border-t border-cashew pt-6 text-sm text-brown">
        Questions? See our <Link className="underline" href="/contact">contact details</Link>
        {slug === "privacy-policy" && (
          <>
            {" "}or <Link className="underline" href="/data-request">ask us to access, correct or delete your data</Link>
          </>
        )}
        .
      </p>
    </main>
  );
}

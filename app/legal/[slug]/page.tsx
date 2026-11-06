import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { legalPages } from "@/lib/legal";

export function generateStaticParams() {
  return legalPages.map((p) => ({ slug: p.slug }));
}

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const page = legalPages.find((p) => p.slug === slug);
  return page ? { title: page.title, alternates: { canonical: `/legal/${slug}` } } : {};
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
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="font-serif text-4xl text-forest">{page.title}</h1>
      {!("template" in page && page.template === false) && (
        <p className="mt-4 rounded-lg bg-gold/20 px-4 py-3 text-sm text-chocolate">
          Template text – the business must review and replace this policy before launch.
        </p>
      )}
      <div className="mt-6 space-y-4 text-chocolate">
        {page.body.map((para) => (
          <p key={para}>{para}</p>
        ))}
      </div>
    </main>
  );
}

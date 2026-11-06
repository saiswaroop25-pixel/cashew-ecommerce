import type { Metadata } from "next";
import { Suspense } from "react";
import { BulkForm } from "@/components/bulk/bulk-form";
import { buttonVariants } from "@/components/ui/button";
import { getProfile } from "@/lib/auth/dal";
import { cn } from "@/lib/utils";
import { bulkEnquiryWhatsAppMessage, whatsappLink } from "@/lib/whatsapp";
import { getSite } from "@/services/site";

export const metadata: Metadata = {
  title: "Bulk orders & wholesale enquiries",
  description: "Request a quotation for bulk cashew orders – for distributors, retailers, hotels and restaurants.",
  alternates: { canonical: "/bulk-orders" },
};

const steps = [
  { title: "Send your enquiry", text: "Tell us the variety, grade, quantity and delivery timeline you need." },
  { title: "Get a quotation", text: "We review your requirements and reply with a quotation." },
  { title: "Confirm and order", text: "Once you are happy with the terms, we agree the order together." },
];

export default async function BulkOrdersPage() {
  const site = await getSite();
  const wa = whatsappLink(site.whatsapp, bulkEnquiryWhatsAppMessage());
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
      <p className="text-xs uppercase tracking-[0.3em] text-gold">Wholesale &amp; bulk</p>
      <h1 className="mt-2 font-serif text-4xl text-forest md:text-5xl">Bulk orders</h1>
      <p className="mt-4 max-w-2xl text-lg text-brown">
        Distributors, retailers, hotels and restaurants can request a quotation for larger quantities and custom packaging.
      </p>

      <ol className="mt-8 grid gap-4 sm:grid-cols-3">
        {steps.map((s, i) => (
          <li key={s.title} className="rounded-card border border-cashew p-5">
            <span className="font-serif text-2xl text-gold">{String(i + 1).padStart(2, "0")}</span>
            <h2 className="mt-1 font-serif text-lg text-chocolate">{s.title}</h2>
            <p className="mt-1 text-sm text-brown">{s.text}</p>
          </li>
        ))}
      </ol>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_16rem]">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-card bg-cashew/40" aria-hidden />}>
          <FormSection />
        </Suspense>

        <aside className="h-fit space-y-4 rounded-card bg-cashew/40 p-6 text-sm text-chocolate">
          <h2 className="font-serif text-xl text-forest">Prefer to chat?</h2>
          {wa ? (
            <>
              <p>Message us on WhatsApp with your requirement.</p>
              <a href={wa} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants(), "w-full")}>
                Enquire on WhatsApp
              </a>
            </>
          ) : (
            <p>WhatsApp contact is not set up yet. Please use the form.</p>
          )}
          {site.email && (
            <p>Or email <a className="text-forest underline" href={`mailto:${site.email}`}>{site.email}</a>.</p>
          )}
        </aside>
      </div>
    </main>
  );
}

/** Reads the session to prefill known details, so it lives inside Suspense. */
async function FormSection() {
  const [profile, site] = await Promise.all([getProfile(), getSite()]);
  return (
    <BulkForm
      whatsappNumber={site.whatsapp}
      defaults={{ fullName: profile?.fullName ?? "", email: profile?.email ?? "", phone: profile?.phone ?? "" }}
    />
  );
}

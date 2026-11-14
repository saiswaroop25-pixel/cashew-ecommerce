import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { whatsappLink } from "@/lib/whatsapp";
import { getSite } from "@/services/site";

export const metadata: Metadata = {
  title: "Contact us",
  description: "How to reach us, our business details and who to contact with a complaint.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="font-serif text-4xl text-forest">Contact us</h1>
      <Suspense fallback={null}>
        <Details />
      </Suspense>
    </main>
  );
}

async function Details() {
  const site = await getSite();
  const wa = whatsappLink(site.whatsapp, "Hello!");
  const business: [string, string][] = [
    ["Business name", site.legalName || site.name],
    ["Address", site.address],
    ["GST number", site.gstin],
    ["FSSAI licence number", site.fssai],
  ].filter((r): r is [string, string] => !!r[1]);
  const grievanceEmail = site.grievanceEmail || site.email;

  return (
    <div className="mt-8 space-y-10 text-chocolate">
      <section aria-labelledby="reach">
        <h2 id="reach" className="font-serif text-2xl text-forest">Get in touch</h2>
        <ul className="mt-3 space-y-2">
          {site.email && <li>Email: <a className="underline" href={`mailto:${site.email}`}>{site.email}</a></li>}
          {site.phone && <li>Phone: <a className="underline" href={`tel:${site.phone}`}>{site.phone}</a></li>}
          {wa && <li>WhatsApp: <a className="underline" href={wa} target="_blank" rel="noopener noreferrer">Message us</a></li>}
          <li>Buying in volume? <Link className="underline" href="/bulk-orders">Request a quotation</Link></li>
          {!site.email && !site.phone && !wa && <li>Send us a message through the <Link className="underline" href="/bulk-orders">enquiry form</Link>.</li>}
        </ul>
      </section>

      <section aria-labelledby="biz">
        <h2 id="biz" className="font-serif text-2xl text-forest">Business details</h2>
        <dl className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-[12rem_1fr]">
          {business.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-brown">{k}</dt>
              <dd className="whitespace-pre-line">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="grievance">
        <h2 id="grievance" className="font-serif text-2xl text-forest">Complaints and privacy</h2>
        <p className="mt-3">
          {site.grievanceName ? `Our grievance officer is ${site.grievanceName}. ` : ""}
          {grievanceEmail ? (
            <>Write to <a className="underline" href={`mailto:${grievanceEmail}`}>{grievanceEmail}</a> with any complaint about an order or about your data.</>
          ) : (
            "Use the details above to send a complaint."
          )}
        </p>
        <p className="mt-3">
          To see, correct or delete the data we hold about you, use the <Link className="underline" href="/data-request">data request form</Link>.
        </p>
      </section>
    </div>
  );
}

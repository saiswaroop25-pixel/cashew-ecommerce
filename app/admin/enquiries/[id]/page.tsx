import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EnquiryStatusForm, QuotationForm, QuotationOutcomeForm, SendDraftForm } from "@/components/admin/enquiry-forms";
import { Badge, PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/dal";
import { PACKAGING_OPTIONS, type PackagingKey } from "@/lib/validators/bulk";
import { formatINR } from "@/lib/utils";
import { ENQUIRY_LABELS, getAdminEnquiry, type EnquiryStatus } from "@/services/admin/enquiries";
import { whatsappLink } from "@/lib/whatsapp";

export const metadata: Metadata = { title: "Enquiry" };

// Private, login-only page: allowed to block on the session and live data (opts out of Next's dev instant-navigation check).
export const instant = false;

export default async function AdminEnquiryPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const e = await getAdminEnquiry(id);
  if (!e) notFound();

  const waDigits = (e.whatsapp ?? e.phone).replace(/[^\d]/g, "");
  // India default country code for bare 10-digit numbers
  const wa = whatsappLink(waDigits.length === 10 ? `91${waDigits}` : waDigits, `Hello ${e.fullName}, this is regarding your bulk enquiry ${e.reference}.`);

  return (
    <>
      <Link href="/admin/enquiries" className="text-sm text-forest underline">← All enquiries</Link>
      <div className="mt-3">
        <PageHeader title={e.reference} subtitle={`Received ${e.createdAt.toLocaleString("en-IN")}`} actions={<Badge value={e.status} label={ENQUIRY_LABELS[e.status as EnquiryStatus]} />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <section className="rounded-card bg-white p-6 text-sm shadow-soft" aria-labelledby="buyer-h">
            <h2 id="buyer-h" className="font-serif text-xl text-forest">Buyer</h2>
            <p className="mt-3 text-chocolate">{e.fullName} · {e.companyName}</p>
            <p className="text-brown"><a className="underline" href={`mailto:${e.email}`}>{e.email}</a> · {e.phone}{e.whatsapp ? ` · WhatsApp ${e.whatsapp}` : ""}</p>
            <p className="text-brown">{e.location}</p>
            {wa && <p className="mt-2"><a href={wa} target="_blank" rel="noopener noreferrer" className="text-forest underline">Message on WhatsApp ↗</a></p>}
            {e.profile && <p className="mt-1 text-xs text-brown">Signed-in account: {e.profile.email}</p>}
          </section>

          <section className="rounded-card bg-white p-6 text-sm shadow-soft" aria-labelledby="req-h">
            <h2 id="req-h" className="font-serif text-xl text-forest">Requirement</h2>
            <dl className="mt-3 grid grid-cols-2 gap-3">
              <div><dt className="text-xs uppercase tracking-widest text-gold-text">Variety</dt><dd className="text-chocolate">{e.variety}</dd></div>
              <div><dt className="text-xs uppercase tracking-widest text-gold-text">Grade</dt><dd className="text-chocolate">{e.grade ?? "–"}</dd></div>
              <div><dt className="text-xs uppercase tracking-widest text-gold-text">Quantity</dt><dd className="text-chocolate">{e.quantityKg} kg</dd></div>
              <div><dt className="text-xs uppercase tracking-widest text-gold-text">Packaging</dt><dd className="text-chocolate">{PACKAGING_OPTIONS[e.packaging as PackagingKey] ?? e.packaging ?? "–"}</dd></div>
              <div><dt className="text-xs uppercase tracking-widest text-gold-text">Delivery by</dt><dd className="text-chocolate">{e.expectedDelivery ? e.expectedDelivery.toISOString().slice(0, 10) : "–"}</dd></div>
            </dl>
            {e.requirements && <p className="mt-4 whitespace-pre-wrap rounded-lg bg-cashew/40 p-3 text-chocolate">{e.requirements}</p>}
          </section>

          <section className="rounded-card bg-white p-6 text-sm shadow-soft" aria-labelledby="quotes-h">
            <h2 id="quotes-h" className="font-serif text-xl text-forest">Quotations</h2>
            {e.quotations.length === 0 ? (
              <p className="mt-3 text-brown">No quotation yet. Create one using the form.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {e.quotations.map((q) => (
                  <li key={q.id} className="rounded-lg border border-cashew p-4">
                    <p className="flex items-center justify-between gap-3">
                      <span className="text-chocolate">{q.quantityKg} kg × {formatINR(q.pricePerKgPaise)} = <strong>{formatINR(q.pricePerKgPaise * q.quantityKg)}</strong></span>
                      <Badge value={q.status} label={q.status.toLowerCase()} />
                    </p>
                    <p className="mt-1 text-xs text-brown">{q.createdAt.toLocaleDateString("en-IN")}{q.validUntil ? ` · valid until ${q.validUntil.toISOString().slice(0, 10)}` : ""}</p>
                    {q.terms && <p className="mt-2 whitespace-pre-wrap text-brown">{q.terms}</p>}
                    <div className="mt-3">
                      {q.status === "DRAFT" ? <SendDraftForm id={e.id} quotationId={q.id} /> : <QuotationOutcomeForm id={e.id} quotationId={q.id} />}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-card bg-white p-5 shadow-soft"><h2 className="mb-3 font-serif text-lg text-forest">Status &amp; notes</h2><EnquiryStatusForm id={e.id} status={e.status} adminNotes={e.adminNotes ?? ""} /></section>
          <section className="rounded-card bg-white p-5 shadow-soft"><h2 className="mb-3 font-serif text-lg text-forest">New quotation</h2><QuotationForm id={e.id} defaultQuantityKg={e.quantityKg} /></section>
        </aside>
      </div>
    </>
  );
}

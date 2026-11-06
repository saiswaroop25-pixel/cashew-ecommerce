import type { Metadata } from "next";
import { LinkButton } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { PACKAGING_OPTIONS, type PackagingKey } from "@/lib/validators/bulk";

export const metadata: Metadata = { title: "My bulk enquiries", robots: { index: false } };

const STATUS_LABEL: Record<string, string> = {
  NEW: "Received",
  CONTACTED: "We have contacted you",
  QUOTED: "Quotation sent",
  CONVERTED: "Converted to an order",
  CLOSED: "Closed",
};

export default async function EnquiriesPage() {
  const profile = await requireUser();
  // Matches enquiries sent while signed in. profileId in the WHERE keeps it to your own.
  const enquiries = await prisma.bulkEnquiry.findMany({
    where: { profileId: profile.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  if (enquiries.length === 0) {
    return (
      <div className="rounded-card bg-white p-10 text-center shadow-soft">
        <p className="text-chocolate">You have not sent any bulk enquiries while signed in.</p>
        <LinkButton href="/bulk-orders" className="mt-4">Request a quotation</LinkButton>
      </div>
    );
  }
  return (
    <ul className="space-y-3">
      {enquiries.map((e) => (
        <li key={e.id} className="rounded-card bg-white p-5 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-serif text-lg text-chocolate">{e.reference}</p>
            <p className="text-xs uppercase tracking-widest text-gold">{STATUS_LABEL[e.status] ?? e.status}</p>
          </div>
          <p className="mt-1 text-sm text-brown">
            {e.quantityKg} kg · {e.variety}{e.grade && e.grade !== "ANY" ? ` · ${e.grade}` : ""} · {PACKAGING_OPTIONS[e.packaging as PackagingKey] ?? e.packaging}
          </p>
          <p className="text-xs text-brown/70">Sent {e.createdAt.toLocaleDateString("en-IN")}</p>
        </li>
      ))}
    </ul>
  );
}

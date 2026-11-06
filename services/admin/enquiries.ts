import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { ENQUIRY_LABELS, ENQUIRY_STATUSES, type EnquiryStatus } from "@/lib/admin/enquiry-status";
import { prisma } from "@/lib/prisma";
import { AdminError } from "@/services/admin/products";
import { logAudit, type Actor } from "@/services/admin/audit";
import { sendQuotationEmail } from "@/services/email";

export const ENQUIRIES_PER_PAGE = 25;
export { ENQUIRY_LABELS, ENQUIRY_STATUSES, type EnquiryStatus };

export async function listAdminEnquiries(args: { status?: EnquiryStatus; q?: string; page?: number } = {}) {
  const where: Prisma.BulkEnquiryWhereInput = {
    ...(args.status && { status: args.status }),
    ...(args.q && {
      OR: [
        { reference: { contains: args.q, mode: "insensitive" } },
        { companyName: { contains: args.q, mode: "insensitive" } },
        { fullName: { contains: args.q, mode: "insensitive" } },
        { email: { contains: args.q, mode: "insensitive" } },
      ],
    }),
  };
  const page = Math.max(1, args.page ?? 1);
  const [total, enquiries] = await Promise.all([
    prisma.bulkEnquiry.count({ where }),
    prisma.bulkEnquiry.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * ENQUIRIES_PER_PAGE,
      take: ENQUIRIES_PER_PAGE,
      select: { id: true, reference: true, status: true, companyName: true, fullName: true, quantityKg: true, variety: true, grade: true, createdAt: true },
    }),
  ]);
  return { enquiries, total, page, totalPages: Math.max(1, Math.ceil(total / ENQUIRIES_PER_PAGE)) };
}

export async function getAdminEnquiry(id: string) {
  return prisma.bulkEnquiry.findUnique({
    where: { id },
    include: { quotations: { orderBy: { createdAt: "desc" } }, profile: { select: { email: true } } },
  });
}

export async function updateEnquiry(id: string, data: { status: EnquiryStatus; adminNotes: string | null }, actor: Actor) {
  const before = await prisma.bulkEnquiry.findUnique({ where: { id }, select: { status: true, reference: true } });
  if (!before) throw new AdminError("Enquiry not found.");
  await prisma.bulkEnquiry.update({ where: { id }, data });
  await logAudit(actor, {
    action: "enquiry.update",
    entity: "BulkEnquiry",
    entityId: id,
    summary: `${before.reference}: ${before.status === data.status ? `notes updated (${data.status})` : `${before.status} -> ${data.status}`}`,
  });
}

export type QuotationInput = { pricePerKgPaise: number; quantityKg: number; validUntil: Date | null; terms: string | null };

/**
 * Records a quotation. When `send` is true it is emailed to the buyer, marked SENT, and the enquiry
 * moves to QUOTED (unless it was already converted/closed).
 */
export async function createQuotation(enquiryId: string, input: QuotationInput, send: boolean, actor: Actor) {
  const enquiry = await prisma.bulkEnquiry.findUnique({ where: { id: enquiryId }, select: { reference: true, status: true } });
  if (!enquiry) throw new AdminError("Enquiry not found.");

  const quotation = await prisma.quotation.create({ data: { enquiryId, ...input, status: send ? "SENT" : "DRAFT" } });
  if (send && (enquiry.status === "NEW" || enquiry.status === "CONTACTED")) {
    await prisma.bulkEnquiry.update({ where: { id: enquiryId }, data: { status: "QUOTED" } });
  }
  await logAudit(actor, {
    action: send ? "quotation.send" : "quotation.draft",
    entity: "BulkEnquiry",
    entityId: enquiryId,
    summary: `${enquiry.reference}: quotation ${send ? "sent" : "saved as draft"} (${input.quantityKg} kg @ ${input.pricePerKgPaise} paise/kg)`,
  });
  if (send) await sendQuotationEmail(quotation.id).catch((e) => console.error("quotation email failed", e));
  return quotation;
}

/** Sends a previously saved draft. */
export async function sendQuotation(quotationId: string, actor: Actor) {
  const q = await prisma.quotation.findUnique({ where: { id: quotationId }, include: { enquiry: { select: { id: true, reference: true, status: true } } } });
  if (!q) throw new AdminError("Quotation not found.");
  if (q.status !== "DRAFT") throw new AdminError("Only a draft quotation can be sent.");
  await prisma.quotation.update({ where: { id: quotationId }, data: { status: "SENT" } });
  if (q.enquiry.status === "NEW" || q.enquiry.status === "CONTACTED") {
    await prisma.bulkEnquiry.update({ where: { id: q.enquiry.id }, data: { status: "QUOTED" } });
  }
  await logAudit(actor, { action: "quotation.send", entity: "BulkEnquiry", entityId: q.enquiry.id, summary: `${q.enquiry.reference}: draft quotation sent` });
  await sendQuotationEmail(quotationId).catch((e) => console.error("quotation email failed", e));
}

export async function setQuotationStatus(quotationId: string, status: "ACCEPTED" | "REJECTED" | "EXPIRED", actor: Actor) {
  const q = await prisma.quotation.findUnique({ where: { id: quotationId }, select: { status: true, enquiry: { select: { id: true, reference: true } } } });
  if (!q) throw new AdminError("Quotation not found.");
  if (q.status === "DRAFT") throw new AdminError("A draft has not been sent yet.");
  await prisma.quotation.update({ where: { id: quotationId }, data: { status } });
  await logAudit(actor, { action: "quotation.status", entity: "BulkEnquiry", entityId: q.enquiry.id, summary: `${q.enquiry.reference}: quotation marked ${status}` });
}

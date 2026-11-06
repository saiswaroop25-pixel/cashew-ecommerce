import "server-only";
import { randomInt } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { formatReference, type BulkEnquiryInput } from "@/lib/validators/bulk";

export class RateLimitError extends Error {}

const PER_EMAIL_PER_HOUR = 3;
const GLOBAL_PER_HOUR = 200;

/**
 * Stores a bulk enquiry and returns its reference number.
 *
 * Abuse protection here is deliberately simple and database-backed (works on serverless):
 * a few enquiries per email per hour and a global ceiling. Proper per-IP rate limiting
 * is added in the security-hardening phase.
 */
export async function createBulkEnquiry(input: BulkEnquiryInput, profileId: string | null, now: Date) {
  const since = new Date(now.getTime() - 60 * 60_000);
  const [mine, all] = await Promise.all([
    prisma.bulkEnquiry.count({ where: { email: input.email, createdAt: { gte: since } } }),
    prisma.bulkEnquiry.count({ where: { createdAt: { gte: since } } }),
  ]);
  if (mine >= PER_EMAIL_PER_HOUR || all >= GLOBAL_PER_HOUR) throw new RateLimitError();

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await prisma.bulkEnquiry.create({
        data: {
          reference: formatReference(now.getUTCFullYear(), randomInt(0, 1_000_000)),
          profileId,
          fullName: input.fullName,
          companyName: input.companyName,
          email: input.email,
          phone: input.phone,
          whatsapp: input.whatsapp,
          location: input.location,
          variety: input.variety,
          grade: input.grade,
          quantityKg: input.quantityKg,
          packaging: input.packaging,
          expectedDelivery: input.expectedDelivery,
          requirements: input.requirements,
        },
      });
    } catch (e) {
      // Reference collision (unique constraint): pick another number.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") continue;
      throw e;
    }
  }
  throw new Error("Could not allocate an enquiry reference");
}

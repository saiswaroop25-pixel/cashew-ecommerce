import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const CUSTOMERS_PER_PAGE = 25;

export type CustomerRow = {
  id: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  role: "CUSTOMER" | "ADMIN";
  createdAt: Date;
  /** orders whose payment was taken (paid, processing, shipped, delivered) */
  paidOrders: number;
  /** total of those orders, in paise */
  spentPaise: number;
};

/** Registered accounts with how much each has bought. Admin-only (callers must use requireAdmin). */
export async function listCustomers(args: { q?: string; page?: number } = {}) {
  const page = Math.max(1, args.page ?? 1);
  const q = args.q?.trim().slice(0, 80);
  const search = q
    ? Prisma.sql`WHERE p.email ILIKE ${"%" + q + "%"} OR p."fullName" ILIKE ${"%" + q + "%"} OR p.phone ILIKE ${"%" + q + "%"}`
    : Prisma.empty;

  const [rows, count] = await Promise.all([
    prisma.$queryRaw<{ id: string; email: string; fullName: string | null; phone: string | null; role: "CUSTOMER" | "ADMIN"; createdAt: Date; paidOrders: number; spentPaise: number }[]>`
      SELECT p.id, p.email, p."fullName", p.phone, p.role, p."createdAt",
             COUNT(o.id) FILTER (WHERE o.status IN ('PAID','PROCESSING','SHIPPED','DELIVERED'))::int AS "paidOrders",
             COALESCE(SUM(o."totalPaise") FILTER (WHERE o.status IN ('PAID','PROCESSING','SHIPPED','DELIVERED')), 0)::int AS "spentPaise"
        FROM "Profile" p
        LEFT JOIN "Order" o ON o."profileId" = p.id
        ${search}
       GROUP BY p.id
       ORDER BY p."createdAt" DESC
       LIMIT ${CUSTOMERS_PER_PAGE} OFFSET ${(page - 1) * CUSTOMERS_PER_PAGE}`,
    prisma.$queryRaw<{ n: number }[]>`SELECT COUNT(*)::int AS n FROM "Profile" p ${search}`,
  ]);
  const total = count[0]?.n ?? 0;
  return { customers: rows as CustomerRow[], total, page, totalPages: Math.max(1, Math.ceil(total / CUSTOMERS_PER_PAGE)) };
}

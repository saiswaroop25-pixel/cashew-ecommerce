import "server-only";
import { prisma } from "@/lib/prisma";
import { REVENUE_STATUSES } from "@/lib/orders/transitions";

export type LowStockRow = { name: string; slug: string; label: string; sku: string; available: number; threshold: number };

export async function getDashboardStats() {
  const [totalOrders, sales, toFulfil, awaitingPayment, completed, customers, newEnquiries, lowStock, recentOrders] = await Promise.all([
    // "Orders" = orders where the customer actually completed checkout (unpaid carts-turned-orders excluded)
    prisma.order.count({ where: { status: { notIn: ["PENDING_PAYMENT", "CANCELLED"] } } }),
    prisma.order.aggregate({ where: { status: { in: REVENUE_STATUSES } }, _sum: { totalPaise: true } }),
    prisma.order.count({ where: { status: { in: ["PAID", "PROCESSING"] } } }),
    prisma.order.count({ where: { status: "PENDING_PAYMENT" } }),
    prisma.order.count({ where: { status: "DELIVERED" } }),
    prisma.profile.count({ where: { role: "CUSTOMER" } }),
    prisma.bulkEnquiry.count({ where: { status: "NEW" } }),
    prisma.$queryRaw<{ name: string; slug: string; label: string; sku: string; available: number; threshold: number }[]>`
      SELECT p.name, p.slug, v.label, v.sku,
             (i.quantity - i.reserved)::int AS available,
             i."lowStockThreshold"::int     AS threshold
        FROM "Inventory" i
        JOIN "ProductVariant" v ON v.id = i."variantId"
        JOIN "Product" p        ON p.id = v."productId"
       WHERE v."isActive" AND p."isActive"
         AND (i.quantity - i.reserved) <= i."lowStockThreshold"
       ORDER BY (i.quantity - i.reserved) ASC
       LIMIT 10`,
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, orderNumber: true, customerName: true, status: true, totalPaise: true, createdAt: true },
    }),
  ]);

  return {
    totalOrders,
    totalSalesPaise: sales._sum.totalPaise ?? 0,
    ordersToFulfil: toFulfil,
    ordersAwaitingPayment: awaitingPayment,
    ordersCompleted: completed,
    customers,
    newEnquiries,
    lowStock: lowStock as LowStockRow[],
    recentOrders,
  };
}

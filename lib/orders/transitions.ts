/**
 * Order status rules for the admin dashboard (pure, no I/O).
 *
 *   PENDING_PAYMENT --cancel--------------> CANCELLED       (releases reserved stock, no money involved)
 *   PAID ---------> PROCESSING ---> SHIPPED ---> DELIVERED   (fulfilment, one step at a time)
 *   PAID/PROCESSING --cancel + refund----> REFUNDED          (money returned, stock put back)
 *   SHIPPED/DELIVERED --refund-----------> REFUNDED          (goods already left: no automatic restock)
 *
 * Nothing leaves CANCELLED or REFUNDED. Statuses can never be set freely, so an order cannot, for
 * example, jump from PAID straight to DELIVERED or be "un-cancelled".
 */
export type OrderStatus = "PENDING_PAYMENT" | "PAID" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "REFUNDED";

export const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Awaiting payment",
  PAID: "Paid",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

/** Fulfilment steps an admin may take from each status. */
const ADVANCE: Partial<Record<OrderStatus, OrderStatus>> = {
  PAID: "PROCESSING",
  PROCESSING: "SHIPPED",
  SHIPPED: "DELIVERED",
};

export function nextFulfilmentStatus(from: OrderStatus): OrderStatus | null {
  return ADVANCE[from] ?? null;
}

export function canAdvance(from: OrderStatus, to: OrderStatus): boolean {
  return ADVANCE[from] === to;
}

/** What cancelling does from a given status, or null when cancelling is not allowed. */
export function cancelKind(status: OrderStatus): "release-stock" | "refund-and-restock" | null {
  if (status === "PENDING_PAYMENT") return "release-stock";
  if (status === "PAID" || status === "PROCESSING") return "refund-and-restock";
  return null;
}

/** Money can be refunded once it has actually been taken and while some of it remains. */
export function canRefund(status: OrderStatus, amountPaise: number, refundedPaise: number): boolean {
  const paid = status === "PAID" || status === "PROCESSING" || status === "SHIPPED" || status === "DELIVERED";
  return paid && refundedPaise < amountPaise;
}

/** Validates a refund request amount (paise): positive integer, no more than what is left. */
export function validateRefundAmount(requestedPaise: number, amountPaise: number, refundedPaise: number): string | null {
  if (!Number.isInteger(requestedPaise) || requestedPaise <= 0) return "Enter a refund amount greater than zero.";
  if (requestedPaise > amountPaise - refundedPaise) return "That is more than the amount still available to refund.";
  return null;
}

/** Revenue counts only orders whose payment was taken and not (fully) refunded or cancelled. */
export const REVENUE_STATUSES: OrderStatus[] = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"];

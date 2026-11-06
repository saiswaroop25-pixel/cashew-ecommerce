import { OrderSummary } from "@/components/cart/order-summary";
import { formatINR } from "@/lib/utils";

export type OrderForDisplay = {
  orderNumber: string;
  status: string;
  customerName: string;
  email: string;
  phone: string;
  shipLine1: string;
  shipLine2: string | null;
  shipCity: string;
  shipState: string;
  shipPostal: string;
  subtotalPaise: number;
  discountPaise: number;
  shippingPaise: number;
  totalPaise: number;
  items: { id: string; productName: string; variantLabel: string; quantity: number; lineTotalPaise: number }[];
};

export const STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: "Awaiting payment",
  PAID: "Paid",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

export function OrderDetails({ order }: { order: OrderForDisplay }) {
  return (
    <>
      <section className="rounded-card bg-white p-6 shadow-soft">
        <h2 className="font-serif text-2xl text-forest">Items</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {order.items.map((i) => (
            <li key={i.id} className="flex justify-between gap-3">
              <span className="text-chocolate">{i.productName} <span className="text-brown">({i.variantLabel}) × {i.quantity}</span></span>
              <span className="text-brown">{formatINR(i.lineTotalPaise)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 border-t border-cashew pt-4">
          <OrderSummary
            totals={{
              subtotalPaise: order.subtotalPaise,
              discountPaise: order.discountPaise,
              shippingPaise: order.shippingPaise,
              totalPaise: order.totalPaise,
              freeShippingRemainingPaise: 0,
            }}
          />
        </div>
      </section>

      <section className="mt-6 rounded-card bg-white p-6 text-sm shadow-soft">
        <h2 className="font-serif text-2xl text-forest">Delivery to</h2>
        <address className="mt-2 not-italic text-brown">
          {order.customerName}<br />
          {order.shipLine1}{order.shipLine2 ? `, ${order.shipLine2}` : ""}<br />
          {order.shipCity}, {order.shipState} {order.shipPostal}<br />
          {order.phone} · {order.email}
        </address>
      </section>
    </>
  );
}

import "server-only";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { site } from "@/lib/site";
import { formatINR } from "@/lib/utils";
import { PACKAGING_OPTIONS, type PackagingKey } from "@/lib/validators/bulk";

/** Escape user-supplied text before it goes into an HTML email. */
export const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

let resend: Resend | undefined;

/**
 * Sends one email. Never throws: a mail outage must not break order processing.
 * Without RESEND_API_KEY (or with a placeholder EMAIL_FROM) it logs and skips,
 * so local development works.
 */
export async function sendEmail(args: { to: string; subject: string; html: string }): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from || /placeholder|example\.com/i.test(from)) {
    console.info(`[email skipped - not configured] "${args.subject}"`);
    return false;
  }
  try {
    resend ??= new Resend(key);
    const { error } = await resend.emails.send({ from, to: args.to, subject: args.subject, html: args.html });
    if (error) {
      console.error("[email failed]", args.subject, error.name);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[email failed]", args.subject, e);
    return false;
  }
}

const wrap = (body: string) =>
  `<div style="font-family:Arial,sans-serif;color:#38271f;max-width:560px">${body}<p style="color:#795438;font-size:12px;margin-top:24px">${esc(site.name)}</p></div>`;

/** Customer payment confirmation, plus a heads-up to the business. */
export async function sendOrderPaidEmails(orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) return;

  const rows = order.items
    .map(
      (i) =>
        `<tr><td style="padding:4px 12px 4px 0">${esc(i.productName)} (${esc(i.variantLabel)}) x ${i.quantity}</td><td style="text-align:right">${formatINR(i.lineTotalPaise)}</td></tr>`,
    )
    .join("");
  const summary = `
    <table style="border-collapse:collapse;font-size:14px">${rows}
      <tr><td style="padding-top:8px">Shipping</td><td style="text-align:right;padding-top:8px">${order.shippingPaise === 0 ? "Free" : formatINR(order.shippingPaise)}</td></tr>
      ${order.discountPaise > 0 ? `<tr><td>Discount</td><td style="text-align:right">- ${formatINR(order.discountPaise)}</td></tr>` : ""}
      <tr><td style="padding-top:8px"><strong>Total paid</strong></td><td style="text-align:right;padding-top:8px"><strong>${formatINR(order.totalPaise)}</strong></td></tr>
    </table>`;
  const address = `${esc(order.customerName)}<br>${esc(order.shipLine1)}${order.shipLine2 ? ", " + esc(order.shipLine2) : ""}<br>${esc(order.shipCity)}, ${esc(order.shipState)} ${esc(order.shipPostal)}`;

  await sendEmail({
    to: order.email,
    subject: `Payment received - order ${order.orderNumber}`,
    html: wrap(`<h2 style="color:#344b35">Thank you, ${esc(order.customerName)}!</h2>
      <p>We have received your payment for order <strong>${esc(order.orderNumber)}</strong>.</p>${summary}
      <p><strong>Delivering to</strong><br>${address}</p>
      <p>We will email you again when your order ships.</p>`),
  });

  const admin = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (admin) {
    await sendEmail({
      to: admin,
      subject: `New paid order ${order.orderNumber} - ${formatINR(order.totalPaise)}`,
      html: wrap(
        `<h2>New paid order ${esc(order.orderNumber)}</h2>${summary}<p>${address}<br>${esc(order.phone)} / ${esc(order.email)}</p>${order.notes ? `<p>Notes: ${esc(order.notes)}</p>` : ""}`,
      ),
    });
  }
}

/** Acknowledgement to the buyer + full details to the business. */
export async function sendBulkEnquiryEmails(enquiryId: string) {
  const e = await prisma.bulkEnquiry.findUnique({ where: { id: enquiryId } });
  if (!e) return;

  const packaging = PACKAGING_OPTIONS[e.packaging as PackagingKey] ?? e.packaging ?? "-";
  const details = `
    <table style="border-collapse:collapse;font-size:14px">
      <tr><td style="padding:3px 12px 3px 0;color:#795438">Reference</td><td><strong>${esc(e.reference)}</strong></td></tr>
      <tr><td style="padding:3px 12px 3px 0;color:#795438">Variety / grade</td><td>${esc(e.variety)} / ${esc(e.grade ?? "-")}</td></tr>
      <tr><td style="padding:3px 12px 3px 0;color:#795438">Quantity</td><td>${e.quantityKg} kg</td></tr>
      <tr><td style="padding:3px 12px 3px 0;color:#795438">Packaging</td><td>${esc(packaging)}</td></tr>
      <tr><td style="padding:3px 12px 3px 0;color:#795438">Delivery by</td><td>${e.expectedDelivery ? e.expectedDelivery.toISOString().slice(0, 10) : "-"}</td></tr>
      <tr><td style="padding:3px 12px 3px 0;color:#795438">Location</td><td>${esc(e.location)}</td></tr>
    </table>
    ${e.requirements ? `<p><strong>Additional requirements</strong><br>${esc(e.requirements).replace(/\n/g, "<br>")}</p>` : ""}`;

  await sendEmail({
    to: e.email,
    subject: `We received your enquiry ${e.reference}`,
    html: wrap(`<h2 style="color:#344b35">Thank you, ${esc(e.fullName)}</h2>
      <p>We have received your bulk enquiry and will get back to you with a quotation.</p>${details}
      <p style="color:#795438;font-size:12px">Please quote your reference number in any follow-up.</p>`),
  });

  const admin = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (admin) {
    await sendEmail({
      to: admin,
      subject: `New bulk enquiry ${e.reference} - ${e.quantityKg} kg from ${e.companyName}`,
      html: wrap(`<h2>New bulk enquiry ${esc(e.reference)}</h2>
        <p><strong>${esc(e.fullName)}</strong>, ${esc(e.companyName)}<br>
        ${esc(e.email)} / ${esc(e.phone)}${e.whatsapp ? ` / WhatsApp ${esc(e.whatsapp)}` : ""}</p>${details}`),
    });
  } else {
    console.warn(`[bulk enquiry ${e.reference}] ADMIN_NOTIFICATION_EMAIL is not set - nobody was notified`);
  }
}

/**
 * Builds a WhatsApp click-to-chat link (https://wa.me/<number>?text=<message>).
 * The number comes from configuration (NEXT_PUBLIC_WHATSAPP_NUMBER), never hard-coded.
 * Returns null when no valid number is configured so the UI can hide the button.
 */
export function whatsappLink(number: string | undefined | null, message: string): string | null {
  const digits = (number ?? "").replace(/[\s+()-]/g, "");
  // International format without the leading +, 8-15 digits (E.164 limit).
  if (!/^[1-9]\d{7,14}$/.test(digits)) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function bulkEnquiryWhatsAppMessage(reference?: string): string {
  return reference
    ? `Hello, I submitted a bulk cashew enquiry (reference ${reference}). Could you please share a quotation?`
    : "Hello, I would like to enquire about bulk cashew orders.";
}

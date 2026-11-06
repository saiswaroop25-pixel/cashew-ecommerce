/** Bulk-enquiry statuses and labels. Plain module so both server and client code can import it. */
export type EnquiryStatus = "NEW" | "CONTACTED" | "QUOTED" | "CONVERTED" | "CLOSED";

export const ENQUIRY_STATUSES: EnquiryStatus[] = ["NEW", "CONTACTED", "QUOTED", "CONVERTED", "CLOSED"];

export const ENQUIRY_LABELS: Record<EnquiryStatus, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  QUOTED: "Quoted",
  CONVERTED: "Converted",
  CLOSED: "Closed",
};

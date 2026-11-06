"use server";

import { getProfile } from "@/lib/auth/dal";
import { echoValues, fieldErrors, type FormState } from "@/lib/validators/auth";
import { makeBulkEnquirySchema } from "@/lib/validators/bulk";
import { RateLimitError, createBulkEnquiry } from "@/services/bulk";
import { sendBulkEnquiryEmails } from "@/services/email";

export type BulkFormState = FormState & { reference?: string };

const SUCCESS_MESSAGE = "Thank you! Your enquiry has been received.";

export async function submitBulkEnquiry(_prev: BulkFormState, fd: FormData): Promise<BulkFormState> {
  const values = echoValues(fd);
  const now = new Date();
  const parsed = makeBulkEnquirySchema(now).safeParse(Object.fromEntries(fd));

  if (!parsed.success) {
    // A filled honeypot gets a convincing fake success so bots learn nothing.
    if (parsed.error.issues.some((i) => i.path[0] === "website")) {
      return { ok: true, message: SUCCESS_MESSAGE, reference: "BLK-PENDING" };
    }
    return { ok: false, errors: fieldErrors(parsed.error), values };
  }

  // Link the enquiry to the account when signed in (guests can enquire too).
  const profile = await getProfile();

  try {
    const enquiry = await createBulkEnquiry(parsed.data, profile?.id ?? null, now);
    // Emails never fail the request: the enquiry is already safely stored.
    await sendBulkEnquiryEmails(enquiry.id).catch((e) => console.error("bulk enquiry email failed", e));
    return { ok: true, message: SUCCESS_MESSAGE, reference: enquiry.reference };
  } catch (e) {
    if (e instanceof RateLimitError) {
      return { ok: false, values, message: "You have sent several enquiries recently. Please wait a while before sending another, or contact us directly." };
    }
    console.error("submitBulkEnquiry failed", e);
    return { ok: false, values, message: "We could not save your enquiry. Please try again." };
  }
}

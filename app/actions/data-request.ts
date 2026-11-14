"use server";

import { echoValues, fieldErrors, type FormState } from "@/lib/validators/auth";
import { dataRequestSchema } from "@/lib/validators/data-request";
import { createDataRequest } from "@/services/data-requests";
import { sendDataRequestEmails } from "@/services/email";
import { rateLimited } from "@/services/rate-limit";

export type DataRequestState = FormState & { reference?: string };

const SUCCESS = "Thank you. We have received your request and sent a confirmation to your email.";

export async function submitDataRequest(_prev: DataRequestState, fd: FormData): Promise<DataRequestState> {
  const values = echoValues(fd);
  const limited = await rateLimited("dataRequest", String(fd.get("email") ?? "").trim());
  if (limited) return { ok: false, message: limited, values };
  const parsed = dataRequestSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) {
    // A filled honeypot gets a fake success so bots learn nothing.
    if (parsed.error.issues.some((i) => i.path[0] === "website")) return { ok: true, message: SUCCESS };
    return { ok: false, errors: fieldErrors(parsed.error), values };
  }
  try {
    const request = await createDataRequest({ email: parsed.data.email, kind: parsed.data.kind, details: parsed.data.details });
    await sendDataRequestEmails(request.id).catch((e) => console.error("data request email failed", e));
    return { ok: true, message: SUCCESS, reference: request.reference };
  } catch (e) {
    console.error("submitDataRequest failed", e);
    return { ok: false, values, message: "We could not save your request. Please try again, or write to us directly." };
  }
}

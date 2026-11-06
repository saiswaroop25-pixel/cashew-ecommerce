import type { ZodError } from "zod";

/** Zod issues -> { "variants.0.price": "message" } so nested rows can show their own errors. */
export function deepErrors(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? issue.path.join(".") : "form";
    out[key] ??= issue.message;
  }
  return out;
}

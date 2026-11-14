import { z } from "zod";

export const DATA_REQUEST_KINDS = ["DELETE", "ACCESS", "CORRECT"] as const;
export type DataRequestKind = (typeof DATA_REQUEST_KINDS)[number];

export const DATA_REQUEST_LABELS: Record<DataRequestKind, string> = {
  DELETE: "Delete my data",
  ACCESS: "Send me a copy of my data",
  CORRECT: "Correct my data",
};

export const dataRequestSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address")).pipe(z.string().max(254)),
  kind: z.enum(DATA_REQUEST_KINDS, { error: "Choose what you would like us to do" }),
  details: z
    .string()
    .trim()
    .max(1000, "Please keep this under 1000 characters")
    .optional()
    .transform((v) => v || null),
  // Honeypot: real people never fill this in.
  website: z.string().max(0).optional(),
});

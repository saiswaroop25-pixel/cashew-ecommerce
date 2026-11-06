import { z } from "zod";

export const newsletterSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address")).pipe(z.string().max(254)),
  consent: z.literal("on", { error: "Please tick the box to give your consent" }),
  // Honeypot: real users never fill this; bots often do.
  website: z.string().max(0).optional(),
});

export type NewsletterState = { ok: boolean; message: string; email?: string };

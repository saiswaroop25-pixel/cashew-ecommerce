import { z } from "zod";
import { INDIAN_STATES } from "@/lib/india";
import { indianPhone } from "@/lib/validators/auth";

export const checkoutSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(80),
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address")).pipe(z.string().max(254)),
  phone: indianPhone,
  line1: z.string().trim().min(3, "Enter the delivery address").max(120),
  line2: z.string().trim().max(120).optional().transform((v) => v || null),
  city: z.string().trim().min(2, "Enter the city").max(60),
  state: z.enum(INDIAN_STATES, { error: "Select a state" }),
  postalCode: z.string().trim().regex(/^[1-9]\d{5}$/, "Enter a valid 6-digit PIN code"),
  notes: z.string().trim().max(300, "Notes can be up to 300 characters").optional().transform((v) => v || null),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

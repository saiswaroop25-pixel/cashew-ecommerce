import { z } from "zod";

const email = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address")).pipe(z.string().max(254));

/** 8+ chars with at least one letter and one digit. */
const password = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password is too long")
  .regex(/[A-Za-z]/, "Password must include a letter")
  .regex(/\d/, "Password must include a number");

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, "Enter your full name").max(80),
    email,
    password,
    confirmPassword: z.string(),
    terms: z.literal("on", { error: "Please tick the box to agree to the Terms and Privacy Policy" }),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password"),
});

export const forgotSchema = z.object({ email });

export const resetSchema = z
  .object({ password, confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

/** Indian mobile: optional +91 / 0 prefix, then 10 digits starting 6-9. */
export const indianPhone = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, "").replace(/^(\+91|91|0)(?=\d{10}$)/, ""))
  .pipe(z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"));

export const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(80),
  phone: z.union([z.literal(""), indianPhone]).transform((v) => v || null),
});

export const addressSchema = z.object({
  label: z.string().trim().max(30).optional().transform((v) => v || null),
  fullName: z.string().trim().min(2, "Enter the recipient's name").max(80),
  phone: indianPhone,
  line1: z.string().trim().min(3, "Enter the address").max(120),
  line2: z.string().trim().max(120).optional().transform((v) => v || null),
  city: z.string().trim().min(2, "Enter the city").max(60),
  state: z.string().trim().min(2, "Enter the state").max(60),
  postalCode: z.string().trim().regex(/^[1-9]\d{5}$/, "Enter a valid 6-digit PIN code"),
  isDefault: z.preprocess((v) => v === "on", z.boolean()),
});

export type FormState = {
  ok: boolean;
  message?: string;
  /** field -> first error message */
  errors?: Record<string, string>;
  /** echoed back so React's post-action form reset does not wipe what was typed */
  values?: Record<string, string>;
};

/** Flatten zod issues to {field: firstMessage}. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}

/** FormData -> plain strings, never echoing password fields. */
export function echoValues(fd: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of fd.entries()) {
    if (typeof v === "string" && !/password/i.test(k) && !k.startsWith("$ACTION")) out[k] = v;
  }
  return out;
}

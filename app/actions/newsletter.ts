"use server";

import { prisma } from "@/lib/prisma";
import { newsletterSchema, type NewsletterState } from "@/lib/validators/newsletter";

const SUCCESS = "Thank you! You are subscribed. You can unsubscribe at any time.";

export async function subscribeNewsletter(_prev: NewsletterState, formData: FormData): Promise<NewsletterState> {
  const parsed = newsletterSchema.safeParse({
    email: formData.get("email"),
    consent: formData.get("consent") ?? undefined,
    website: formData.get("website") ?? "",
  });

  if (!parsed.success) {
    // A filled honeypot gets a fake success so bots learn nothing.
    if (parsed.error.issues.some((i) => i.path[0] === "website")) return { ok: true, message: SUCCESS };
    // Echo the email back: React resets the form after an action, which would wipe it.
    return { ok: false, message: parsed.error.issues[0].message, email: String(formData.get("email") ?? "") };
  }

  try {
    await prisma.newsletterSubscription.upsert({
      where: { email: parsed.data.email },
      create: { email: parsed.data.email },
      // Re-subscribing records fresh consent. Same response either way, so the
      // form cannot be used to discover who is already on the list.
      update: { unsubscribedAt: null, consentGivenAt: new Date() },
    });
  } catch (err) {
    console.error("newsletter subscribe failed", err);
    return { ok: false, message: "Something went wrong. Please try again." };
  }
  return { ok: true, message: SUCCESS };
}

export async function unsubscribeNewsletter(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "");
  if (!token) return;
  await prisma.newsletterSubscription.updateMany({
    where: { unsubscribeToken: token, unsubscribedAt: null },
    data: { unsubscribedAt: new Date() },
  });
}

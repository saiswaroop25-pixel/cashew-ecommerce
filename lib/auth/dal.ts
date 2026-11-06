import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

/**
 * Data access layer for authentication/authorisation. Always verify with the
 * auth server (getUser), never trust the cookie contents alone.
 */
export const getSessionUser = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
});

/** Application profile (role, phone…) – created lazily on first sign-in. */
export const getProfile = cache(async () => {
  const user = await getSessionUser();
  if (!user?.email) return null;
  const existing = await prisma.profile.findUnique({ where: { id: user.id } });
  if (existing) return existing;
  const fullName = typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null;
  // upsert tolerates two simultaneous first requests.
  return prisma.profile.upsert({
    where: { id: user.id },
    update: {},
    create: { id: user.id, email: user.email, fullName },
  });
});

export async function requireUser() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  return profile;
}

/** Admin pages/actions: signed-out users go to login, non-admins see a 404 (no hint the area exists). */
export async function requireAdmin() {
  const profile = await requireUser();
  if (profile.role !== "ADMIN") notFound();
  return profile;
}

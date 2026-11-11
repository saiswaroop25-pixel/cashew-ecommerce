import Link from "next/link";
import { getProfile } from "@/lib/auth/dal";

/** Reads the session cookie, so it must be rendered inside <Suspense>. */
export async function AuthNav() {
  const profile = await getProfile();
  const link = "text-sm text-chocolate hover:text-forest";
  if (!profile) return <Link href="/login" className={link}>Sign in</Link>;
  return (
    <>
      {profile.role === "ADMIN" && (
        <Link href="/admin" className="rounded-full bg-forest px-3 py-1 text-sm text-cream hover:bg-forest/90">Admin</Link>
      )}
      <Link href="/account" className={link}>My account</Link>
    </>
  );
}

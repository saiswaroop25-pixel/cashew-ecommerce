import Link from "next/link";
import { getSessionUser } from "@/lib/auth/dal";

/** Reads the session cookie, so it must be rendered inside <Suspense>. */
export async function AuthNav() {
  const user = await getSessionUser();
  return user ? (
    <Link href="/account" className="text-sm text-chocolate hover:text-forest">My account</Link>
  ) : (
    <Link href="/login" className="text-sm text-chocolate hover:text-forest">Sign in</Link>
  );
}

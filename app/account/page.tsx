import type { Metadata } from "next";
import { ProfileForm } from "@/components/account/account-forms";
import { FormMessage } from "@/components/ui/field";
import { requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "My account", robots: { index: false } };

// Private, login-only page: allowed to block on the session and live data (opts out of Next's dev instant-navigation check).
export const instant = false;

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [profile, sp] = await Promise.all([requireUser(), searchParams]);
  return (
    <div className="max-w-md space-y-4">
      {sp.password === "updated" && <FormMessage ok message="Your password has been updated." />}
      <ProfileForm email={profile.email} fullName={profile.fullName ?? ""} phone={profile.phone ?? ""} />
    </div>
  );
}

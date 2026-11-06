import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/ui";
import { SettingsForm } from "@/components/admin/settings-form";
import { requireAdmin } from "@/lib/auth/dal";
import { getSavedSiteSettings } from "@/services/admin/content";

export const metadata: Metadata = { title: "Company details" };

export default async function AdminSettingsPage() {
  await requireAdmin();
  const saved = await getSavedSiteSettings();
  return (
    <>
      <PageHeader title="Company & contact details" subtitle="Appears in the header, footer, bulk-order page and emails. Anything you leave empty is simply not shown." />
      <SettingsForm saved={saved} />
    </>
  );
}

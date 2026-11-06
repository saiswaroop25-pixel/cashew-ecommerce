import type { Metadata } from "next";
import Link from "next/link";
import { MainVideoEditor, StageEditors } from "@/components/admin/process-editor";
import { PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/dal";
import { getProcessData } from "@/services/manufacturing";

export const metadata: Metadata = { title: "Process page" };

export default async function AdminProcessPage() {
  await requireAdmin();
  const data = await getProcessData();
  return (
    <>
      <PageHeader title="Process page" subtitle="The video and the 13 steps shown on the public process page." actions={<Link href="/process" target="_blank" rel="noopener noreferrer" className="text-sm text-forest underline">View page ↗</Link>} />
      <div className="space-y-8">
        <MainVideoEditor current={data.mainVideo} />
        <StageEditors stages={data.stages} />
      </div>
    </>
  );
}

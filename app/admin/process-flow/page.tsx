import type { Metadata } from "next";
import Link from "next/link";
import { ProcessFlowEditor } from "@/components/admin/process-flow-editor";
import { PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/dal";
import { getProcessFlow } from "@/services/manufacturing";

export const metadata: Metadata = { title: "Home: process flow" };

// Private, login-only page: allowed to block on the session and live data (opts out of Next's dev instant-navigation check).
export const instant = false;

export default async function AdminProcessFlowPage() {
  await requireAdmin();
  const steps = await getProcessFlow();
  return (
    <>
      <PageHeader
        title="Home page: process flow"
        subtitle="The picture-led “From fruit to finished pack” section on the home page. Edit each step's wording and add a picture so visitors can follow the process."
        actions={<Link href="/#process" target="_blank" rel="noopener noreferrer" className="text-sm text-forest underline">View on home page ↗</Link>}
      />
      <ProcessFlowEditor steps={steps} />
    </>
  );
}

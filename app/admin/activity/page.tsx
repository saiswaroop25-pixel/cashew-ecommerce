import type { Metadata } from "next";
import { PageHeader, tableClasses } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Activity log" };

// Private, login-only page: allowed to block on the session and live data (opts out of Next's dev instant-navigation check).
export const instant = false;

export default async function ActivityPage() {
  await requireAdmin();
  const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 150 });

  return (
    <>
      <PageHeader title="Activity log" subtitle="Every change made in the admin area: who, what and when. Showing the latest 150." />
      {logs.length === 0 ? (
        <p className="rounded-card bg-white p-8 text-center text-brown shadow-soft">Nothing recorded yet.</p>
      ) : (
        <div className={tableClasses.wrap}>
          <table className={tableClasses.table}>
            <thead className={tableClasses.head}>
              <tr>
                <th scope="col" className={tableClasses.th}>When</th>
                <th scope="col" className={tableClasses.th}>Who</th>
                <th scope="col" className={tableClasses.th}>Action</th>
                <th scope="col" className={tableClasses.th}>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className={tableClasses.row}>
                  <td className={`${tableClasses.td} whitespace-nowrap`}>{l.createdAt.toLocaleString("en-IN")}</td>
                  <td className={tableClasses.td}>{l.actorEmail}</td>
                  <td className={tableClasses.td}><code className="rounded bg-cashew/50 px-1.5 py-0.5 text-xs">{l.action}</code></td>
                  <td className={tableClasses.td}>{l.summary ?? `${l.entity} ${l.entityId ?? ""}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

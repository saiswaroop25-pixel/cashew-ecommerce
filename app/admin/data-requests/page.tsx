import type { Metadata } from "next";
import { Badge, PageHeader, tableClasses } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { markDataRequestDone } from "@/app/actions/admin/data-requests";
import { requireAdmin } from "@/lib/auth/dal";
import { DATA_REQUEST_LABELS, type DataRequestKind } from "@/lib/validators/data-request";
import { listDataRequests } from "@/services/data-requests";

export const metadata: Metadata = { title: "Data requests" };

// Private, login-only page: allowed to block on the session and live data (opts out of Next's dev instant-navigation check).
export const instant = false;

export default async function AdminDataRequests() {
  await requireAdmin();
  const requests = await listDataRequests();
  const open = requests.filter((r) => r.status === "OPEN").length;
  return (
    <>
      <PageHeader title="Data requests" subtitle={`${open} open · people asking to see, correct or delete their data`} />
      <p className="mb-4 text-sm text-brown">
        Before deleting anything, check that the request comes from the owner of that email address (reply to it and ask them to confirm).
        Keep the order and invoice records the law requires. Replies are due within the number of days stated in your Privacy Policy.
      </p>
      {requests.length === 0 ? (
        <p className="rounded-card bg-white p-8 text-center text-brown shadow-soft">No requests yet.</p>
      ) : (
        <div className={tableClasses.wrap}>
          <table className={tableClasses.table}>
            <thead className={tableClasses.head}>
              <tr>
                <th scope="col" className={tableClasses.th}>Reference</th>
                <th scope="col" className={tableClasses.th}>Person</th>
                <th scope="col" className={tableClasses.th}>Request</th>
                <th scope="col" className={tableClasses.th}>Received</th>
                <th scope="col" className={tableClasses.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className={tableClasses.row}>
                  <td className={tableClasses.td}>{r.reference}</td>
                  <td className={tableClasses.td}>
                    {r.email}
                    {r.details && (
                      <>
                        <br />
                        <span className="text-xs text-brown">{r.details}</span>
                      </>
                    )}
                  </td>
                  <td className={tableClasses.td}>{DATA_REQUEST_LABELS[r.kind as DataRequestKind] ?? r.kind}</td>
                  <td className={tableClasses.td}>{r.createdAt.toLocaleDateString("en-IN")}</td>
                  <td className={tableClasses.td}>
                    {r.status === "OPEN" ? (
                      <form action={markDataRequestDone} className="flex items-center gap-2">
                        <input type="hidden" name="id" value={r.id} />
                        <Badge value="NEW" label="Open" />
                        <Button type="submit" size="sm" variant="outline">Mark done</Button>
                      </form>
                    ) : (
                      <Badge value="DONE" label="Done" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

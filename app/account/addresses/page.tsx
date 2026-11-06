import type { Metadata } from "next";
import { deleteAddress, setDefaultAddress } from "@/app/actions/account";
import { AddressForm } from "@/components/account/account-forms";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "My addresses", robots: { index: false } };

// Private, login-only page: allowed to block on the session and live data (opts out of Next's dev instant-navigation check).
export const instant = false;

export default async function AddressesPage() {
  const profile = await requireUser();
  const addresses = await prisma.address.findMany({
    where: { profileId: profile.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });

  return (
    <div className="space-y-8">
      {addresses.length === 0 && <p className="text-brown">You have no saved addresses yet.</p>}
      <ul className="grid gap-4 md:grid-cols-2">
        {addresses.map((a) => (
          <li key={a.id} className="rounded-card bg-white p-5 shadow-soft">
            <p className="flex items-center gap-2 font-serif text-lg text-chocolate">
              {a.label || "Address"}
              {a.isDefault && <span className="rounded-full bg-forest/10 px-2 py-0.5 font-sans text-xs text-forest">Default</span>}
            </p>
            <address className="mt-2 text-sm not-italic text-brown">
              {a.fullName}<br />
              {a.line1}{a.line2 ? `, ${a.line2}` : ""}<br />
              {a.city}, {a.state} {a.postalCode}<br />
              {a.phone}
            </address>
            <div className="mt-4 flex flex-wrap gap-2">
              {!a.isDefault && (
                <form action={setDefaultAddress}>
                  <input type="hidden" name="id" value={a.id} />
                  <Button type="submit" variant="ghost" size="sm">Make default</Button>
                </form>
              )}
              <form action={deleteAddress}>
                <input type="hidden" name="id" value={a.id} />
                <Button type="submit" variant="ghost" size="sm" aria-label={`Delete address ${a.label ?? ""}`}>Delete</Button>
              </form>
            </div>
            <details className="mt-3">
              <summary className="cursor-pointer text-sm text-forest underline">Edit</summary>
              <div className="mt-4">
                <AddressForm address={a} submitLabel="Update address" />
              </div>
            </details>
          </li>
        ))}
      </ul>

      <section className="max-w-md">
        <h2 className="font-serif text-2xl text-forest">Add an address</h2>
        <div className="mt-4">
          <AddressForm submitLabel="Save address" />
        </div>
      </section>
    </div>
  );
}

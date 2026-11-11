import Link from "next/link";
import { cacheLife } from "next/cache";
import { legalPages } from "@/lib/legal";
import { whatsappLink } from "@/lib/whatsapp";
import { getSite } from "@/services/site";

async function currentYear() {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}

export async function Footer() {
  const year = await currentYear();
  const site = await getSite(); // company details from the admin settings (cached)
  const wa = whatsappLink(site.whatsapp, "Hello!");
  const social = [
    { label: "Instagram", url: site.instagramUrl },
    { label: "Facebook", url: site.facebookUrl },
    { label: "YouTube", url: site.youtubeUrl },
  ].filter((s) => s.url);
  const hasContact = !!(site.email || site.phone || wa || site.address);

  return (
    <footer className="mt-24 bg-chocolate text-cream">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-1">
          <p className="font-serif text-xl">{site.name}</p>
          {site.tagline && <p className="mt-1 text-sm text-gold">{site.tagline}</p>}
          {site.about && <p className="mt-3 whitespace-pre-line text-sm text-cream/70">{site.about}</p>}
        </div>

        <FooterList title="Explore">
          <Link href="/">Home</Link>
          <Link href="/shop">Shop</Link>
          <Link href="/#process">Our process</Link>
          <Link href="/bulk-orders">Bulk orders</Link>
        </FooterList>

        <FooterList title="Policies">
          {legalPages.map((p) => (
            <Link key={p.slug} href={`/legal/${p.slug}`}>{p.title}</Link>
          ))}
        </FooterList>

        <FooterList title="Contact">
          {site.email && <a href={`mailto:${site.email}`}>{site.email}</a>}
          {site.phone && <a href={`tel:${site.phone}`}>{site.phone}</a>}
          {wa && <a href={wa} target="_blank" rel="noopener noreferrer">WhatsApp</a>}
          {site.address && <p className="whitespace-pre-line text-cream/70">{site.address}</p>}
          {!hasContact && <Link href="/bulk-orders">Send us an enquiry</Link>}
          {social.length > 0 && (
            <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              {social.map((s) => (
                <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer">{s.label}</a>
              ))}
            </p>
          )}
        </FooterList>
      </div>
      <div className="border-t border-cream/10 py-5 text-center text-xs text-cream/60">
        © {year} {site.name}. All rights reserved.
      </div>
    </footer>
  );
}

function FooterList({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-sans text-xs uppercase tracking-widest text-gold">{title}</h2>
      <div className="mt-4 flex flex-col gap-2 text-sm [&_a:hover]:text-gold">{children}</div>
    </div>
  );
}

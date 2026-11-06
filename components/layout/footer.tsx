import Link from "next/link";
import { site } from "@/lib/site";
import { legalPages } from "@/lib/legal";

export function Footer() {
  const wa = site.whatsappNumber ? `https://wa.me/${site.whatsappNumber}` : null;
  return (
    <footer className="mt-24 bg-chocolate text-cream">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-1">
          <p className="font-serif text-xl">{site.name}</p>
          <p className="mt-3 text-sm text-cream/70">
            Company information to be added by the business.
          </p>
        </div>

        <FooterList title="Explore">
          <Link href="/">Home</Link>
          <Link href="/shop">Shop</Link>
        </FooterList>

        <FooterList title="Policies">
          {legalPages.map((p) => (
            <Link key={p.slug} href={`/legal/${p.slug}`}>{p.title}</Link>
          ))}
        </FooterList>

        <FooterList title="Contact">
          {site.contactEmail ? (
            <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>
          ) : (
            <span className="text-cream/60">Contact email not configured</span>
          )}
          {wa ? (
            <a href={wa} target="_blank" rel="noopener noreferrer">WhatsApp</a>
          ) : (
            <span className="text-cream/60">WhatsApp not configured</span>
          )}
        </FooterList>
      </div>
      <div className="border-t border-cream/10 py-5 text-center text-xs text-cream/60">
        © {site.name}. All rights reserved.
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

import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { Suspense } from "react";
import { AuthNav } from "@/components/layout/auth-nav";
import { CartLink } from "@/components/layout/cart-link";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { JsonLdScript } from "@/components/seo/json-ld";
import { organizationJsonLd, websiteJsonLd } from "@/lib/seo/jsonld";
import { site } from "@/lib/site";
import { getSite } from "@/services/site";
import "./globals.css";

const heading = Playfair_Display({
  variable: "--font-heading",
  subsets: ["latin"],
  display: "swap",
});

const body = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const { name } = await getSite(); // company name from the admin settings (cached)
  return {
    metadataBase: new URL(site.url),
    title: { default: name, template: `%s | ${name}` },
    description: "Premium cashews for households and bulk buyers.",
    // Defaults for link previews; pages can override. The preview image comes from app/opengraph-image.tsx.
    openGraph: { type: "website", siteName: name, locale: "en_IN" },
    twitter: { card: "summary_large_image" },
  };
}

export const viewport: Viewport = {
  themeColor: "#F8F3E9",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const company = await getSite();
  const { name } = company;
  return (
    <html lang="en-IN" className={`${heading.variable} ${body.variable} h-full`}>
      <body className="min-h-full flex flex-col">
        <JsonLdScript
          data={[
            organizationJsonLd({
              name,
              url: site.url,
              email: company.email,
              phone: company.phone,
              address: company.address,
              social: [company.instagramUrl, company.facebookUrl, company.youtubeUrl],
              description: company.about,
            }),
            websiteJsonLd(name, site.url),
          ]}
        />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-forest focus:px-4 focus:py-2 focus:text-cream"
        >
          Skip to content
        </a>
        <Header
          siteName={name}
          cartSlot={
            <Suspense fallback={<span className="inline-block h-9 w-9" aria-hidden />}>
              <CartLink />
            </Suspense>
          }
          authSlot={
            <Suspense fallback={<span className="inline-block h-4 w-14" aria-hidden />}>
              <AuthNav />
            </Suspense>
          }
        />
        <div id="main" className="flex flex-1 flex-col">{children}</div>
        <Footer />
      </body>
    </html>
  );
}

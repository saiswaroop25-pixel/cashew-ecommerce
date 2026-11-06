import { serializeJsonLd, type JsonLd } from "@/lib/seo/jsonld";

/** Renders structured data. The serialiser escapes "<", so the content can never break out of the script tag. */
export function JsonLdScript({ data }: { data: JsonLd | JsonLd[] }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />;
}

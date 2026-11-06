/**
 * Upload rules shared by the server (validation) and the browser (friendly pre-checks).
 * The *server* is the authority: these are checked again when an upload is requested and after it
 * lands, and the Supabase bucket enforces size + type limits independently.
 *
 * Only images are uploaded (product photos, homepage process-flow pictures and banner images).
 */
export type Bucket = "images";
export type UploadKind = "product-image" | "stage-image" | "banner-image";

type Rule = { bucket: Bucket; mimes: Record<string, string>; maxBytes: number; label: string };

const IMAGE_MIMES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" } as const;
const MB = 1024 * 1024;

/** Note: SVG is deliberately NOT allowed - it can carry scripts. */
export const UPLOAD_RULES: Record<UploadKind, Rule> = {
  "product-image": { bucket: "images", mimes: IMAGE_MIMES, maxBytes: 5 * MB, label: "JPEG, PNG, WebP or AVIF image up to 5 MB" },
  "stage-image": { bucket: "images", mimes: IMAGE_MIMES, maxBytes: 5 * MB, label: "JPEG, PNG, WebP or AVIF image up to 5 MB" },
  "banner-image": { bucket: "images", mimes: IMAGE_MIMES, maxBytes: 5 * MB, label: "JPEG, PNG, WebP or AVIF image up to 5 MB" },
};

/** Bucket-level limits, applied to Supabase Storage by scripts/setup-storage.ts. */
export const BUCKETS: Record<Bucket, { public: boolean; fileSizeLimit: number; allowedMimeTypes: string[] }> = {
  images: { public: true, fileSizeLimit: 5 * MB, allowedMimeTypes: Object.keys(IMAGE_MIMES) },
};

export type UploadCheck = { ok: true; bucket: Bucket; ext: string } | { ok: false; error: string };

export function validateUploadRequest(kind: UploadKind, contentType: string, size: number): UploadCheck {
  const rule = UPLOAD_RULES[kind];
  if (!rule) return { ok: false, error: "Unknown upload type." };
  const ext = rule.mimes[contentType.toLowerCase()];
  if (!ext) return { ok: false, error: `This file type is not allowed. Use a ${rule.label}.` };
  if (!Number.isFinite(size) || size <= 0) return { ok: false, error: "The file is empty." };
  if (size > rule.maxBytes) return { ok: false, error: `The file is too large (${(size / MB).toFixed(1)} MB). Use a ${rule.label}.` };
  return { ok: true, bucket: rule.bucket, ext };
}

/** Server-generated object path. The visitor's file name is never used (no path tricks, no collisions). */
export function objectPath(kind: UploadKind, uuid: string, ext: string): string {
  if (!/^[0-9a-f-]{36}$/.test(uuid) || !/^[a-z0-9]{2,5}$/.test(ext)) throw new Error("bad path parts");
  return `${kind}/${uuid}.${ext}`;
}

/**
 * Identifies an image from its first bytes. Used to catch uploads whose declared type is a lie
 * (e.g. an HTML page uploaded with "image/png"). Returns null when nothing matches.
 */
export function detectFileType(b: Uint8Array): string | null {
  const at = (i: number, ...v: number[]) => v.every((x, k) => b[i + k] === x);
  const ascii = (i: number, s: string) => [...s].every((c, k) => b[i + k] === c.charCodeAt(0));

  if (at(0, 0xff, 0xd8, 0xff)) return "image/jpeg";
  if (at(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image/png";
  if (ascii(0, "RIFF") && ascii(8, "WEBP")) return "image/webp";
  if (ascii(4, "ftyp") && (ascii(8, "avif") || ascii(8, "avis"))) return "image/avif";
  return null;
}

export function declaredMatchesContent(declared: string, bytes: Uint8Array): boolean {
  return detectFileType(bytes) === declared.toLowerCase();
}

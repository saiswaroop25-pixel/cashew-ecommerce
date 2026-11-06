/**
 * Upload rules shared by the server (validation) and the browser (friendly pre-checks).
 * The *server* is the authority: these are checked again when an upload is requested and after it
 * lands, and the Supabase buckets enforce size + type limits independently.
 */
export type Bucket = "images" | "video" | "captions";
export type UploadKind = "product-image" | "stage-image" | "process-poster" | "process-video" | "captions";

type Rule = { bucket: Bucket; mimes: Record<string, string>; maxBytes: number; label: string };

const IMAGE_MIMES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" } as const;
const MB = 1024 * 1024;

/** Note: SVG is deliberately NOT allowed - it can carry scripts. */
export const UPLOAD_RULES: Record<UploadKind, Rule> = {
  "product-image": { bucket: "images", mimes: IMAGE_MIMES, maxBytes: 5 * MB, label: "JPEG, PNG, WebP or AVIF image up to 5 MB" },
  "stage-image": { bucket: "images", mimes: IMAGE_MIMES, maxBytes: 5 * MB, label: "JPEG, PNG, WebP or AVIF image up to 5 MB" },
  "process-poster": { bucket: "images", mimes: IMAGE_MIMES, maxBytes: 5 * MB, label: "JPEG, PNG, WebP or AVIF image up to 5 MB" },
  "process-video": { bucket: "video", mimes: { "video/mp4": "mp4", "video/webm": "webm" }, maxBytes: 50 * MB, label: "MP4 or WebM video up to 50 MB" },
  captions: { bucket: "captions", mimes: { "text/vtt": "vtt" }, maxBytes: 1 * MB, label: "WebVTT (.vtt) captions file up to 1 MB" },
};

/** Bucket-level limits, applied to Supabase Storage by scripts/setup-storage.ts. */
export const BUCKETS: Record<Bucket, { public: boolean; fileSizeLimit: number; allowedMimeTypes: string[] }> = {
  images: { public: true, fileSizeLimit: 5 * MB, allowedMimeTypes: Object.keys(IMAGE_MIMES) },
  video: { public: true, fileSizeLimit: 50 * MB, allowedMimeTypes: ["video/mp4", "video/webm"] },
  captions: { public: true, fileSizeLimit: 1 * MB, allowedMimeTypes: ["text/vtt"] },
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
 * Identifies a file from its first bytes. Used to catch uploads whose declared type is a lie
 * (e.g. an HTML page uploaded with "image/png"). Returns null when nothing matches.
 */
export function detectFileType(b: Uint8Array): string | null {
  const at = (i: number, ...v: number[]) => v.every((x, k) => b[i + k] === x);
  const ascii = (i: number, s: string) => [...s].every((c, k) => b[i + k] === c.charCodeAt(0));

  if (at(0, 0xff, 0xd8, 0xff)) return "image/jpeg";
  if (at(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image/png";
  if (ascii(0, "RIFF") && ascii(8, "WEBP")) return "image/webp";
  if (ascii(4, "ftyp")) return ascii(8, "avif") || ascii(8, "avis") ? "image/avif" : "video/mp4";
  if (at(0, 0x1a, 0x45, 0xdf, 0xa3)) return "video/webm";
  // WebVTT may start with a UTF-8 BOM
  const off = at(0, 0xef, 0xbb, 0xbf) ? 3 : 0;
  if (ascii(off, "WEBVTT")) return "text/vtt";
  return null;
}

export function declaredMatchesContent(declared: string, bytes: Uint8Array): boolean {
  return detectFileType(bytes) === declared.toLowerCase();
}

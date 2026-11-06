import { describe, expect, it } from "vitest";
import { BUCKETS, UPLOAD_RULES, declaredMatchesContent, detectFileType, objectPath, validateUploadRequest } from "@/lib/media/rules";

const pad = (v: number[]) => Uint8Array.from([...v, ...new Array(32).fill(0)]);
const text = (s: string) => new TextEncoder().encode(s + " ".repeat(32));
const code = (s: string) => [...s].map((c) => c.charCodeAt(0));
const ftyp = (brand: string) => Uint8Array.from([0, 0, 0, 24, ...code("ftyp"), ...code(brand), 0, 0, 0, 0, ...new Array(16).fill(0)]);
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

describe("validateUploadRequest", () => {
  it("accepts allowed type + size and picks the bucket and extension itself", () => {
    expect(validateUploadRequest("product-image", "image/png", 1000)).toEqual({ ok: true, bucket: "images", ext: "png" });
    expect(validateUploadRequest("process-video", "video/mp4", 20 * 1024 * 1024)).toEqual({ ok: true, bucket: "video", ext: "mp4" });
    expect(validateUploadRequest("captions", "text/vtt", 500)).toEqual({ ok: true, bucket: "captions", ext: "vtt" });
  });
  it.each(["image/svg+xml", "text/html", "application/pdf", "image/gif", "application/x-msdownload", "", "image/png; charset=evil"])("rejects type %j for images", (t) => {
    expect(validateUploadRequest("product-image", t, 1000).ok).toBe(false);
  });
  it("is case-insensitive about the declared type", () => {
    expect(validateUploadRequest("product-image", "IMAGE/JPEG", 1000).ok).toBe(true);
  });
  it("enforces size limits per kind", () => {
    expect(validateUploadRequest("product-image", "image/png", UPLOAD_RULES["product-image"].maxBytes).ok).toBe(true);
    expect(validateUploadRequest("product-image", "image/png", UPLOAD_RULES["product-image"].maxBytes + 1).ok).toBe(false);
    expect(validateUploadRequest("captions", "text/vtt", 2 * 1024 * 1024).ok).toBe(false);
    for (const bad of [0, -5, NaN, Infinity]) expect(validateUploadRequest("product-image", "image/png", bad).ok).toBe(false);
  });
  it("does not let one kind use another kind's types (no video in the image slot, no image as captions)", () => {
    expect(validateUploadRequest("product-image", "video/mp4", 1000).ok).toBe(false);
    expect(validateUploadRequest("process-video", "image/png", 1000).ok).toBe(false);
    expect(validateUploadRequest("captions", "image/png", 1000).ok).toBe(false);
  });
  it("rejects an unknown kind", () => {
    expect(validateUploadRequest("hack" as never, "image/png", 10).ok).toBe(false);
  });
});

describe("bucket policy matches the rules (so the storage layer enforces the same thing)", () => {
  it("every bucket's allowed types and limit equal the union of its kinds' rules", () => {
    for (const [name, b] of Object.entries(BUCKETS)) {
      const kinds = Object.values(UPLOAD_RULES).filter((r) => r.bucket === name);
      expect(new Set(b.allowedMimeTypes)).toEqual(new Set(kinds.flatMap((r) => Object.keys(r.mimes))));
      expect(b.fileSizeLimit).toBe(Math.max(...kinds.map((r) => r.maxBytes)));
    }
  });
  it("SVG is not allowed anywhere", () => {
    for (const b of Object.values(BUCKETS)) expect(b.allowedMimeTypes).not.toContain("image/svg+xml");
  });
});

describe("detectFileType (magic bytes)", () => {
  it("recognises each allowed format", () => {
    expect(detectFileType(pad([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(detectFileType(pad(PNG))).toBe("image/png");
    expect(detectFileType(pad([...code("RIFF"), 0, 0, 0, 0, ...code("WEBP")]))).toBe("image/webp");
    expect(detectFileType(ftyp("avif"))).toBe("image/avif");
    expect(detectFileType(ftyp("isom"))).toBe("video/mp4");
    expect(detectFileType(ftyp("mp42"))).toBe("video/mp4");
    expect(detectFileType(pad([0x1a, 0x45, 0xdf, 0xa3]))).toBe("video/webm");
    expect(detectFileType(text("WEBVTT\n\n00:00.000 --> 00:01.000\nHi"))).toBe("text/vtt");
    expect(detectFileType(Uint8Array.from([0xef, 0xbb, 0xbf, ...text("WEBVTT")]))).toBe("text/vtt");
  });
  it("returns null for scripts, HTML, SVG, executables and empty input", () => {
    for (const s of ["<html><script>alert(1)</script></html>", "<svg onload=alert(1)>", "#!/bin/sh\nrm -rf /", "MZ\u0090\u0000", "just text"]) {
      expect(detectFileType(text(s))).toBeNull();
    }
    expect(detectFileType(new Uint8Array(0))).toBeNull();
  });
  it("catches a lie: HTML uploaded as image/png, or a PNG uploaded as a video", () => {
    expect(declaredMatchesContent("image/png", text("<html>evil</html>"))).toBe(false);
    expect(declaredMatchesContent("video/mp4", pad(PNG))).toBe(false);
    expect(declaredMatchesContent("image/png", pad(PNG))).toBe(true);
  });
});

describe("objectPath", () => {
  const uuid = "123e4567-e89b-42d3-a456-426614174000";
  it("builds a folder/uuid.ext path", () => expect(objectPath("product-image", uuid, "png")).toBe(`product-image/${uuid}.png`));
  it.each(["../etc/passwd", "x", "", "a/b"])("refuses a bad uuid %j", (u) => expect(() => objectPath("product-image", u, "png")).toThrow());
  it.each(["../x", "p/ng", "", "toolongext"])("refuses a bad extension %j", (e) => expect(() => objectPath("product-image", uuid, e)).toThrow());
});

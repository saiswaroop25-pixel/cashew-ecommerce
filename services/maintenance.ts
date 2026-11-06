import "server-only";
import { prisma } from "@/lib/prisma";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { Bucket } from "@/lib/media/rules";
import { pathFromPublicUrl, removeObject } from "@/services/admin/media";
import { purgeRateLimits } from "@/services/rate-limit";

const FOLDERS = ["product-image", "stage-image", "banner-image"] as const;
const PAGE = 1000;

/**
 * Files in storage that no product photo, process step or banner refers to, and that are older than
 * `minAgeMs`. The age limit protects uploads that are still in progress (uploaded, not yet saved).
 */
export async function findOrphanedUploads(minAgeMs: number, now = Date.now()): Promise<{ bucket: Bucket; path: string; ageMs: number }[]> {
  const [photos, steps, banners] = await Promise.all([
    prisma.productImage.findMany({ select: { url: true } }),
    prisma.manufacturingMedia.findMany({ select: { url: true, posterUrl: true, captionsUrl: true } }),
    prisma.banner.findMany({ select: { imageUrl: true } }),
  ]);
  const referenced = new Set<string>();
  const add = (url: string | null | undefined) => {
    const ref = url ? pathFromPublicUrl(url) : null;
    if (ref) referenced.add(`${ref.bucket}/${ref.path}`);
  };
  photos.forEach((p) => add(p.url));
  steps.forEach((s) => [s.url, s.posterUrl, s.captionsUrl].forEach(add));
  banners.forEach((b) => add(b.imageUrl));

  const storage = getSupabaseAdmin().storage.from("images");
  const orphans: { bucket: Bucket; path: string; ageMs: number }[] = [];
  for (const folder of FOLDERS) {
    for (let offset = 0; ; offset += PAGE) {
      const { data, error } = await storage.list(folder, { limit: PAGE, offset });
      if (error) throw new Error(`storage list failed: ${error.message}`);
      const files = (data ?? []).filter((o) => o.id); // folders have no id
      for (const f of files) {
        const path = `${folder}/${f.name}`;
        const created = f.created_at ? new Date(f.created_at).getTime() : now;
        const ageMs = now - created;
        if (!referenced.has(`images/${path}`) && ageMs >= minAgeMs) orphans.push({ bucket: "images", path, ageMs });
      }
      if ((data ?? []).length < PAGE) break;
    }
  }
  return orphans;
}

export async function cleanupOrphanedUploads(minAgeMs = 24 * 3_600_000): Promise<number> {
  const orphans = await findOrphanedUploads(minAgeMs);
  for (const o of orphans) await removeObject(o.bucket, o.path);
  return orphans.length;
}

/** Everything the daily maintenance job does. Each step is independent: one failing never blocks the rest. */
export async function runMaintenance() {
  const result = { rateLimitRows: 0, webhookEvents: 0, orphanedFiles: 0, errors: [] as string[] };
  const step = async (name: string, fn: () => Promise<number>) => {
    try {
      return await fn();
    } catch (e) {
      console.error(`maintenance step failed: ${name}`, e);
      result.errors.push(name);
      return 0;
    }
  };
  result.rateLimitRows = await step("rate-limits", () => purgeRateLimits(24));
  // Payment-provider events are only needed long enough to recognise duplicate deliveries.
  result.webhookEvents = await step("webhook-events", async () =>
    (await prisma.webhookEvent.deleteMany({ where: { processedAt: { lt: new Date(Date.now() - 30 * 86_400_000) } } })).count,
  );
  result.orphanedFiles = await step("orphaned-uploads", () => cleanupOrphanedUploads());
  return result;
}

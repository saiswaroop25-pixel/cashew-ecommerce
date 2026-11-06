/**
 * Creates (or updates) the Supabase Storage buckets with the same size/type limits as lib/media/rules.ts.
 * Safe to run repeatedly:  npm run storage:setup
 * Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local (the key is never printed).
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { BUCKETS, type Bucket } from "../lib/media/rules";

config({ path: ".env.local" });

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local");

  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: existing, error: listError } = await supabase.storage.listBuckets();
  if (listError) throw new Error(`Could not list buckets: ${listError.message}`);
  const have = new Set(existing.map((b) => b.name));

  for (const [name, cfg] of Object.entries(BUCKETS) as [Bucket, (typeof BUCKETS)[Bucket]][]) {
    const options = { public: cfg.public, fileSizeLimit: cfg.fileSizeLimit, allowedMimeTypes: cfg.allowedMimeTypes };
    const { error } = have.has(name) ? await supabase.storage.updateBucket(name, options) : await supabase.storage.createBucket(name, options);
    if (error) throw new Error(`Bucket "${name}": ${error.message}`);
    console.log(`${have.has(name) ? "updated" : "created"} bucket "${name}"  (${cfg.allowedMimeTypes.join(", ")}; max ${cfg.fileSizeLimit / 1024 / 1024} MB; public read)`);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", quiet: true });

import { createClient } from "@supabase/supabase-js";

/**
 * Provisions the Storage buckets.
 *
 * Every bucket is PRIVATE. These hold sealed contracts, signature images and
 * client logos — a public bucket would make all of it enumerable by anyone who
 * guessed a path. Access is always through short-lived signed URLs minted
 * server-side, including for the headless-Chromium PDF pass.
 *
 * Idempotent: safe to re-run.
 */

const BUCKETS = [
  {
    id: "proposal-pdfs",
    // Sealed PDFs plus their certificate page. Immutable once written.
    fileSizeLimit: 25 * 1024 * 1024,
    allowedMimeTypes: ["application/pdf"],
  },
  {
    id: "signatures",
    // Rendered signature images. Small by definition; a large upload here is a
    // sign something is wrong, not a legitimate signature.
    fileSizeLimit: 2 * 1024 * 1024,
    allowedMimeTypes: ["image/png", "image/svg+xml"],
  },
  {
    id: "brand-assets",
    // Our logo and client logos used on proposal covers.
    fileSizeLimit: 5 * 1024 * 1024,
    allowedMimeTypes: ["image/png", "image/jpeg", "image/svg+xml", "image/webp"],
  },
] as const;

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required to " +
        "provision Storage buckets.",
    );
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data: existing, error: listError } = await supabase.storage.listBuckets();
  if (listError) throw listError;
  const existingIds = new Set(existing.map((b) => b.id));

  for (const bucket of BUCKETS) {
    if (existingIds.has(bucket.id)) {
      // Re-assert the settings rather than assuming: a bucket flipped to public
      // by hand in the dashboard would otherwise stay public silently.
      const { error } = await supabase.storage.updateBucket(bucket.id, {
        public: false,
        fileSizeLimit: bucket.fileSizeLimit,
        allowedMimeTypes: [...bucket.allowedMimeTypes],
      });
      if (error) throw error;
      console.log(`  = ${bucket.id} (already existed, settings re-asserted)`);
      continue;
    }

    const { error } = await supabase.storage.createBucket(bucket.id, {
      public: false,
      fileSizeLimit: bucket.fileSizeLimit,
      allowedMimeTypes: [...bucket.allowedMimeTypes],
    });
    if (error) throw error;
    console.log(`  + ${bucket.id} (created, private)`);
  }

  const { data: after } = await supabase.storage.listBuckets();
  const publicBuckets = (after ?? []).filter((b) => b.public);
  if (publicBuckets.length > 0) {
    console.error(`\n!! PUBLIC buckets present: ${publicBuckets.map((b) => b.id).join(", ")}`);
    process.exit(1);
  }
  console.log(`\nAll ${after?.length ?? 0} buckets private.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

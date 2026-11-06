import { NextResponse, type NextRequest } from "next/server";
import { isAuthorisedCron } from "@/lib/security/cron-auth";
import { runMaintenance } from "@/services/maintenance";

/**
 * Daily housekeeping: purge old rate-limit counters and webhook records, delete unreferenced uploads.
 * Vercel Cron sends "Authorization: Bearer $CRON_SECRET" automatically. Fails closed without a secret.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return new NextResponse("Cron not configured", { status: 503 });
  if (!isAuthorisedCron(request.headers.get("authorization"), secret)) return new NextResponse("Unauthorized", { status: 401 });
  return NextResponse.json({ ok: true, ...(await runMaintenance()) });
}

import { NextResponse, type NextRequest } from "next/server";
import { isAuthorisedCron } from "@/lib/security/cron-auth";
import { expirePendingOrders } from "@/services/payments";

/**
 * Releases stock held by unpaid orders. Meant to be called on a schedule (every ~15 minutes): see
 * .github/workflows/cron.yml. Needs "Authorization: Bearer $CRON_SECRET". Fails closed without a secret.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return new NextResponse("Cron not configured", { status: 503 });
  if (!isAuthorisedCron(request.headers.get("authorization"), secret)) return new NextResponse("Unauthorized", { status: 401 });

  const minutes = Number(request.nextUrl.searchParams.get("minutes") ?? 30);
  const result = await expirePendingOrders(Number.isFinite(minutes) && minutes >= 1 ? minutes : 30);
  return NextResponse.json({ ok: true, ...result });
}

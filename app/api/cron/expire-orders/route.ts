import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { expirePendingOrders } from "@/services/payments";

function authorised(request: NextRequest, secret: string): boolean {
  const given = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Releases stock held by unpaid orders. Meant to be called on a schedule (Vercel Cron sends
 * "Authorization: Bearer $CRON_SECRET" automatically). Fails closed without a configured secret.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return new NextResponse("Cron not configured", { status: 503 });
  if (!authorised(request, secret)) return new NextResponse("Unauthorized", { status: 401 });

  const minutes = Number(request.nextUrl.searchParams.get("minutes") ?? 30);
  const result = await expirePendingOrders(Number.isFinite(minutes) && minutes >= 1 ? minutes : 30);
  return NextResponse.json({ ok: true, ...result });
}

import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { runDueDistributions } from "@/lib/daily-distribution";
import { runWeeklyReports } from "@/lib/weekly-report";

// The hourly tick: Supabase pg_cron calls this every hour (and Vercel's daily
// cron calls it once as a fallback). It hands out today's scheduled leads and,
// on Monday morning, sends the weekly report. Both are idempotent per day / week,
// so a double call is harmless.
//
// No user session here: the middleware lets /api/cron/* through and this route
// authenticates itself with the shared CRON_SECRET.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

function authorised(request: NextRequest, secret: string): boolean {
  const header = request.headers.get("authorization") ?? "";
  const given = Buffer.from(header);
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

async function handle(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ ok: false, error: "Cron is not configured." }, { status: 503 });
  if (!authorised(request, secret)) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });

  let distributions: Awaited<ReturnType<typeof runDueDistributions>> | { error: string } = {
    error: "not run",
  };
  try {
    distributions = await runDueDistributions();
  } catch (e) {
    Sentry.captureException(e, { tags: { area: "cron-hourly", step: "distributions" } });
    distributions = { error: "Distribution sweep failed." };
  }

  let weekly: Awaited<ReturnType<typeof runWeeklyReports>> | { error: string } = { error: "not run" };
  try {
    weekly = await runWeeklyReports();
  } catch (e) {
    Sentry.captureException(e, { tags: { area: "cron-hourly", step: "weekly-report" } });
    weekly = { error: "Weekly report failed." };
  }

  return NextResponse.json({ ok: true, distributions, weekly });
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}

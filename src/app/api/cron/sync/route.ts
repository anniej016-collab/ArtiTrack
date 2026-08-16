import { NextResponse, type NextRequest } from "next/server";
import { SYNC_BATCH_SIZE, syncAllActive } from "@/lib/sync";

/**
 * Nightly check for new releases.
 *
 * Without this the tracker only learns about a release when someone presses a
 * button, which defeats the point of following an artist at all.
 *
 * Vercel invokes this on the schedule in vercel.json, sending
 * `Authorization: Bearer $CRON_SECRET`. The route refuses to run without that
 * secret configured rather than leaving an unauthenticated endpoint that
 * anyone could hammer.
 */
export const dynamic = "force-dynamic";
// Each artist is a separate request upstream; the default budget is too short.
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return NextResponse.json(
      {
        error:
          "CRON_SECRET is not set, so scheduled syncing is disabled. Add it to the project's Environment Variables.",
      },
      { status: 503 },
    );
  }

  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await syncAllActive(SYNC_BATCH_SIZE);

  return NextResponse.json({
    ok: true,
    ...result,
    checkedAt: new Date().toISOString(),
  });
}

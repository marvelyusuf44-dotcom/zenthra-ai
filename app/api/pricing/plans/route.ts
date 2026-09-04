import { NextResponse } from "next/server";
import { listActivePlans } from "@/src/db/repository";

export const dynamic = "force-dynamic";

/**
 * GET /api/pricing/plans
 * Returns only plans marked active AND priced (price_idr > 0 at seed time
 * for paid tiers) — see src/db/client.ts seedDefaultPlans. This prevents an
 * unconfigured deployment from showing a "Buy Pro" button for a price that
 * was never actually set by the operator.
 */
export async function GET() {
  try {
    const plans = await listActivePlans();
    return NextResponse.json({ ok: true, plans });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

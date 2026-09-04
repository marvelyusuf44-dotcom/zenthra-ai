import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedAdmin } from "@/src/utils/adminAuth";
import { getRevenueStats } from "@/src/db/repository";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/stats
 * Header: x-admin-secret: <ADMIN_API_SECRET>
 * Returns real counts/sums computed from the orders/subscriptions tables —
 * never a fabricated/example dashboard number.
 */
export async function GET(req: NextRequest) {
  if (!isAuthorizedAdmin(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const stats = await getRevenueStats();
    return NextResponse.json({ ok: true, stats });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

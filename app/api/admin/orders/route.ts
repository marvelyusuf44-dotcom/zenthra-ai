import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAuthorizedAdmin } from "@/src/utils/adminAuth";
import { listOrdersByStatus, reviewOrder } from "@/src/db/repository";
import { logger } from "@/src/utils/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/orders?status=PENDING_REVIEW
 * Header: x-admin-secret: <ADMIN_API_SECRET>
 *
 * Fallback admin surface alongside Telegram — the database is the source
 * of truth either way (src/db/repository.ts). Useful if Telegram is not
 * configured for a given deployment, or for a simple future admin web UI.
 */
export async function GET(req: NextRequest) {
  if (!isAuthorizedAdmin(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const status = (req.nextUrl.searchParams.get("status") || "PENDING_REVIEW") as any;
  const validStatuses = ["PENDING_PROOF", "PENDING_REVIEW", "APPROVED", "REJECTED"];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ ok: false, error: `Invalid status: ${status}` }, { status: 400 });
  }

  try {
    const orders = await listOrdersByStatus(status);
    // Convenience: point the admin at the private, authenticated proof-file
    // route (see app/api/admin/proof/[orderId]/route.ts) instead of making
    // them guess the URL. There is no public URL for these files — see
    // FINAL_REPORT.md blocker #2.
    const withProofLinks = orders.map((o) => ({
      ...o,
      proofUrl: o.proof_file_path ? `/api/admin/proof/${o.id}` : null,
    }));
    return NextResponse.json({ ok: true, orders: withProofLinks });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

const ReviewSchema = z.object({
  orderId: z.string().min(1),
  decision: z.enum(["APPROVED", "REJECTED"]),
  note: z.string().max(500).optional(),
});

/**
 * POST /api/admin/orders
 * Header: x-admin-secret: <ADMIN_API_SECRET>
 * Body: { orderId, decision: "APPROVED" | "REJECTED", note? }
 *
 * Manual equivalent of tapping Approve/Reject in Telegram — same
 * reviewOrder() write path, so state stays consistent regardless of which
 * interface was used.
 */
export async function POST(req: NextRequest) {
  if (!isAuthorizedAdmin(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = ReviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const order = await reviewOrder(
      parsed.data.orderId,
      parsed.data.decision,
      "admin-api",
      parsed.data.note
    );
    return NextResponse.json({ ok: true, order });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error("admin_orders.review_failed", { error: msg });
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}

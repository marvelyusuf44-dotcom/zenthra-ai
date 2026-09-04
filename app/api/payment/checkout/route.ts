import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createOrder, upsertUser } from "@/src/db/repository";
import { logger } from "@/src/utils/logger";

export const dynamic = "force-dynamic";

const CheckoutSchema = z.object({
  userId: z.string().min(1).max(200),
  planId: z.enum(["pro", "pro_plus"]),
  email: z.string().email().optional(),
  displayName: z.string().max(200).optional(),
});

/**
 * POST /api/payment/checkout
 * Body: { userId, planId, email?, displayName? }
 *
 * Creates a PENDING_PROOF order and returns static QRIS payment info
 * (configured by the operator via env — see .env.example). V1 uses a
 * static/manual QRIS image + manual transfer-reference flow rather than a
 * dynamic payment-gateway integration, because a dynamic QRIS API is a paid
 * dependency and BLUEPRINT.md §9 forbids making paid APIs mandatory for V1.
 * The user pays manually, uploads proof, and an admin reviews it — see
 * POST /api/payment/upload-proof and the Telegram admin flow.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = CheckoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const qrisImageUrl = process.env.QRIS_STATIC_IMAGE_URL;
  const merchantName = process.env.QRIS_MERCHANT_NAME;

  if (!qrisImageUrl) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "QRIS is not configured on this deployment yet (QRIS_STATIC_IMAGE_URL missing). Checkout is unavailable until an operator configures it.",
      },
      { status: 503 }
    );
  }

  try {
    await upsertUser(parsed.data.userId, parsed.data.email, parsed.data.displayName);
    const order = await createOrder(parsed.data.userId, parsed.data.planId);

    return NextResponse.json({
      ok: true,
      order: {
        id: order.id,
        planId: order.plan_id,
        amountIdr: order.amount_idr,
        status: order.status,
      },
      payment: {
        method: "QRIS (manual transfer + proof upload)",
        qrisImageUrl,
        merchantName: merchantName ?? null,
        amountIdr: order.amount_idr,
        instructions:
          "Scan the QRIS code, transfer the exact amount shown, then upload your payment proof using this order ID.",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error("checkout.failed", { error: msg });
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}

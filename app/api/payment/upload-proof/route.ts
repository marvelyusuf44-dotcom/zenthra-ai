import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { attachProof, getOrder, getPlan } from "@/src/db/repository";
import { notifyAdminNewPaymentProof } from "@/src/telegram/adminBot";
import { logger } from "@/src/utils/logger";

export const dynamic = "force-dynamic";

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

/**
 * POST /api/payment/upload-proof
 * multipart/form-data: { orderId: string, file: File }
 *
 * Stores proof bytes in the durable `payment_proofs` database table, so they
 * survive restarts, deployments and multiple server instances. The file is
 * never placed under `public/` and has no public URL. The bytes are also sent
 * directly to Telegram via multipart upload so the admin can review them
 * immediately. An authenticated admin can fetch the durable copy later via
 * GET /api/admin/proof/[orderId].
 *
 * The database write happens first and is authoritative; the Telegram
 * notification is best-effort — if it fails, the order still sits correctly
 * in PENDING_REVIEW and can be approved via the authenticated admin API.
 *
 * The maximum proof size is intentionally capped at 5MB so the portable
 * database representation remains bounded. For much larger documents, move
 * this repository contract to private object storage in a future version.
 */
export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid multipart form data" }, { status: 400 });
  }

  const orderId = form.get("orderId");
  const file = form.get("file");

  if (typeof orderId !== "string" || !orderId) {
    return NextResponse.json({ ok: false, error: "orderId is required" }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "file is required" }, { status: 400 });
  }
  if (file.size === 0 || file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { ok: false, error: `File must be between 1 byte and ${MAX_FILE_BYTES / 1024 / 1024}MB` },
      { status: 400 }
    );
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { ok: false, error: `Unsupported file type: ${file.type}. Allowed: JPEG, PNG, WEBP, PDF.` },
      { status: 400 }
    );
  }

  const order = await getOrder(orderId);
  if (!order) {
    return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });
  }
  if (order.status !== "PENDING_PROOF" && order.status !== "PENDING_REVIEW") {
    return NextResponse.json(
      { ok: false, error: `Order is already ${order.status}, cannot upload proof.` },
      { status: 409 }
    );
  }

  const plan = await getPlan(order.plan_id);
  if (!plan) {
    return NextResponse.json({ ok: false, error: "Plan not found for this order" }, { status: 500 });
  }

  // Defense in depth: orderId is client-supplied input used inside a
  // filename. Strip anything outside a safe charset so it can never inject
  // a path separator/traversal sequence, even though a real orderId is
  // always a server-generated UUID.
  const safeOrderId = orderId.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 100) || "order";
  const filename = `${safeOrderId}-${randomUUID()}${extensionFor(file.type)}`;

  let bytes: Buffer;
  try {
    bytes = Buffer.from(await file.arrayBuffer());
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error("upload_proof.read_failed", { error: msg, orderId });
    return NextResponse.json({ ok: false, error: `Failed to read file: ${msg}` }, { status: 400 });
  }

  let updatedOrder: Awaited<ReturnType<typeof attachProof>>;
  try {
    updatedOrder = await attachProof(orderId, {
      filename,
      mimeType: file.type,
      byteSize: bytes.byteLength,
      dataBase64: bytes.toString("base64"),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error("upload_proof.database_write_failed", { error: msg, orderId });
    return NextResponse.json({ ok: false, error: "Failed to store payment proof" }, { status: 500 });
  }

  const notifyResult = await notifyAdminNewPaymentProof(updatedOrder, plan, {
    buffer: bytes,
    filename,
    mimeType: file.type,
  });
  if (!notifyResult.ok) {
    logger.warn("upload_proof.telegram_notify_failed", {
      orderId,
      error: notifyResult.error,
    });
  }

  return NextResponse.json({
    ok: true,
    order: { id: updatedOrder.id, status: updatedOrder.status },
    adminNotified: notifyResult.ok,
    adminNotifyError: notifyResult.error,
  });
}

function extensionFor(mime: string): string {
  switch (mime) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "application/pdf":
      return ".pdf";
    default:
      return "";
  }
}
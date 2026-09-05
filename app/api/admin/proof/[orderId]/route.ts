import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { isAuthorizedAdmin } from "@/src/utils/adminAuth";
import { getOrder, getPaymentProof } from "@/src/db/repository";
import { logger } from "@/src/utils/logger";

export const dynamic = "force-dynamic";

const PRIVATE_UPLOAD_DIR = path.join(process.cwd(), "private-uploads");

/**
 * GET /api/admin/proof/[orderId]
 * Header: x-admin-secret: <ADMIN_API_SECRET>
 *
 * Authenticated, admin-only access to a payment proof file. New proofs are
 * read from the durable `payment_proofs` database record, so they remain
 * available across deployments and server instances. The private-uploads
 * fallback is retained only for legacy orders created before database-backed
 * proof storage was introduced.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  if (!isAuthorizedAdmin(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const order = await getOrder(params.orderId);
  if (!order) {
    return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });
  }
  if (!order.proof_file_path) {
    return NextResponse.json({ ok: false, error: "No proof file attached to this order" }, { status: 404 });
  }

  const proof = await getPaymentProof(params.orderId);
  if (proof) {
    const safeFilename = proof.filename.replace(/[\r\n"]/g, "_");
    const data = Buffer.from(proof.data_base64, "base64");
    return new NextResponse(new Uint8Array(data), {
      status: 200,
      headers: {
        "Content-Type": proof.mime_type,
        "Content-Disposition": `inline; filename="${safeFilename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  }

  // Legacy fallback: old orders may reference a filename written before
  // database-backed proof storage existed. New uploads never use this path.
  const safeFilename = path.basename(order.proof_file_path);
  const filePath = path.join(PRIVATE_UPLOAD_DIR, safeFilename);

  try {
    const data = await fs.readFile(filePath);
    return new NextResponse(new Uint8Array(data), {
      status: 200,
      headers: {
        "Content-Type": mimeFromExtension(safeFilename),
        "Content-Disposition": `inline; filename="${safeFilename}"`,
        // Never cache a financial document at a shared/proxy layer.
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn("admin_proof.read_failed", { orderId: params.orderId, error: msg });
    return NextResponse.json({ ok: false, error: "Proof file not found on disk" }, { status: 404 });
  }
}

function mimeFromExtension(filename: string): string {
  const ext = filename.toLowerCase();
  if (ext.endsWith(".jpg") || ext.endsWith(".jpeg")) return "image/jpeg";
  if (ext.endsWith(".png")) return "image/png";
  if (ext.endsWith(".webp")) return "image/webp";
  if (ext.endsWith(".pdf")) return "application/pdf";
  return "application/octet-stream";
}

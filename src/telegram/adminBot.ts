import { ToolHttpError } from "@/src/utils/httpClient";
import { logger } from "@/src/utils/logger";
import type { Order, Plan } from "@/src/db/repository";

/**
 * Telegram is used strictly as an ADMIN INTERFACE, never as the source of
 * truth. The database (src/db) remains the source of truth for
 * order/subscription state; Telegram only:
 *  1. notifies the admin chat when a new payment proof needs review,
 *  2. receives the proof file itself directly (multipart upload — see
 *     sendProofFile below), never via a public URL,
 *  3. lets the admin tap Approve/Reject, which the webhook route then
 *     writes back into the database via src/db/repository.ts.
 * If Telegram is unreachable/misconfigured, the order still sits in
 * PENDING_REVIEW and can be approved through an equivalent authenticated
 * HTTP admin action (see app/api/admin/orders, app/api/admin/proof) —
 * Telegram is a convenience layer, not a dependency the system requires to
 * function correctly.
 *
 * PRIVACY NOTE: proof files are payment documents and must never be reachable
 * via a public URL. This module uploads the file bytes directly to Telegram's
 * API (sendPhoto/sendDocument), while the authoritative copy is stored in the
 * private `payment_proofs` database table. Neither copy is web-accessible
 * without authentication.
 */

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;

function apiUrl(method: string) {
  return `https://api.telegram.org/bot${BOT_TOKEN}/${method}`;
}

export function isTelegramConfigured(): boolean {
  return Boolean(BOT_TOKEN && ADMIN_CHAT_ID);
}

export interface ProofFile {
  buffer: Buffer;
  filename: string;
  mimeType: string;
}

export async function notifyAdminNewPaymentProof(
  order: Order,
  plan: Plan,
  proofFile: ProofFile
): Promise<{ ok: boolean; error?: string }> {
  if (!isTelegramConfigured()) {
    return {
      ok: false,
      error: "Telegram bot not configured (TELEGRAM_BOT_TOKEN / TELEGRAM_ADMIN_CHAT_ID missing).",
    };
  }

  const text =
    `🧾 *New payment proof pending review*\n\n` +
    `Order: \`${order.id}\`\n` +
    `Plan: ${plan.name}\n` +
    `Amount: Rp${order.amount_idr.toLocaleString("id-ID")}\n` +
    `User: \`${order.user_id}\`\n` +
    `Submitted: ${order.updated_at}`;

  try {
    await postTelegram("sendMessage", {
      chat_id: ADMIN_CHAT_ID,
      text,
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "✅ Approve", callback_data: `approve:${order.id}` },
            { text: "❌ Reject", callback_data: `reject:${order.id}` },
          ],
        ],
      },
    });
  } catch (err) {
    const msg = err instanceof ToolHttpError ? err.message : String(err);
    logger.error("telegram.notify_failed", { error: msg, orderId: order.id });
    return { ok: false, error: msg };
  }

  // Send the actual proof file directly to Telegram (private — visible only
  // inside the admin chat, never exposed via any public URL). This is
  // best-effort and non-fatal: the Approve/Reject message above already
  // went out, and the admin can still retrieve the file via the
  // authenticated GET /api/admin/proof/[orderId] fallback if this fails.
  try {
    const isImage = proofFile.mimeType.startsWith("image/");
    if (isImage) {
      await postTelegramFile(
        "sendPhoto",
        { chat_id: ADMIN_CHAT_ID! },
        "photo",
        proofFile
      );
    } else {
      await postTelegramFile(
        "sendDocument",
        { chat_id: ADMIN_CHAT_ID! },
        "document",
        proofFile
      );
    }
  } catch (err) {
    const msg = err instanceof ToolHttpError ? err.message : String(err);
    logger.warn("telegram.send_proof_file_failed", { error: msg, orderId: order.id });
    return {
      ok: true,
      error: `Approve/Reject notification sent, but attaching the proof file failed: ${msg}. Use GET /api/admin/proof/${order.id} instead.`,
    };
  }

  return { ok: true };
}

export async function answerCallback(callbackQueryId: string, text: string) {
  if (!isTelegramConfigured()) return;
  await postTelegram("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text,
  }).catch((err) =>
    logger.warn("telegram.answer_callback_failed", { error: String(err) })
  );
}

export async function editMessageAfterDecision(
  chatId: number | string,
  messageId: number,
  decision: "APPROVED" | "REJECTED",
  actor: string
) {
  if (!isTelegramConfigured()) return;
  const emoji = decision === "APPROVED" ? "✅" : "❌";
  await postTelegram("editMessageReplyMarkup", {
    chat_id: chatId,
    message_id: messageId,
    reply_markup: { inline_keyboard: [] },
  }).catch(() => null);
  await postTelegram("sendMessage", {
    chat_id: chatId,
    text: `${emoji} Order decision recorded: *${decision}* by ${actor}.`,
    parse_mode: "Markdown",
  }).catch(() => null);
}

async function postTelegram(method: string, body: Record<string, unknown>) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(apiUrl(method), {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    clearTimeout(timer);
    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Telegram ${method} failed: HTTP ${res.status} ${errBody}`);
    }
    return res.json();
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

/**
 * Uploads a file directly to Telegram via multipart/form-data (sendPhoto /
 * sendDocument), using the runtime's global FormData/Blob (available in the
 * Node 18+ runtime this project targets — no extra dependency needed).
 * This is what keeps proof files off any public URL: the bytes go straight
 * from our server to Telegram's API.
 */
async function postTelegramFile(
  method: string,
  fields: Record<string, string>,
  fileField: string,
  file: ProofFile
) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    form.append(key, value);
  }
  form.append(
    fileField,
    new Blob([file.buffer], { type: file.mimeType }),
    file.filename
  );

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(apiUrl(method), {
      method: "POST",
      signal: controller.signal,
      body: form,
    });
    clearTimeout(timer);
    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Telegram ${method} failed: HTTP ${res.status} ${errBody}`);
    }
    return res.json();
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

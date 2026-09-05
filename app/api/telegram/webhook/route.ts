import { NextRequest, NextResponse } from "next/server";
import { reviewOrder } from "@/src/db/repository";
import { answerCallback, editMessageAfterDecision } from "@/src/telegram/adminBot";
import { logger } from "@/src/utils/logger";

export const dynamic = "force-dynamic";

interface TelegramUpdate {
  callback_query?: {
    id: string;
    data?: string;
    from?: { username?: string; first_name?: string; id?: number };
    message?: { chat?: { id?: number }; message_id?: number };
  };
}

/**
 * POST /api/telegram/webhook
 *
 * Receives Telegram updates (set this URL via `setWebhook`, see
 * docs/DEPLOYMENT.md addendum in the final report). Handles
 * `callback_query` events from the Approve/Reject inline buttons.
 *
 * SECURITY: validates the shared secret Telegram sends back in the
 * `X-Telegram-Bot-Api-Secret-Token` header (set via `secret_token` when
 * calling setWebhook) so arbitrary internet requests cannot forge admin
 * decisions. The database write (reviewOrder) is the actual source of
 * truth — this route is a thin, verified bridge into it.
 *
 * FAIL-CLOSED: if TELEGRAM_WEBHOOK_SECRET is not configured on the server,
 * this endpoint refuses every request rather than accepting unauthenticated
 * callbacks. An unauthenticated webhook would let anyone on the internet
 * approve/reject payment orders by guessing an order ID, so "not configured"
 * must never be treated as "no verification needed."
 */
export async function POST(req: NextRequest) {
  const configuredSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!configuredSecret) {
    logger.error("telegram_webhook.not_configured", {
      reason: "TELEGRAM_WEBHOOK_SECRET is missing — refusing all webhook requests (fail-closed).",
    });
    return NextResponse.json(
      {
        ok: false,
        error:
          "Telegram webhook is not configured (TELEGRAM_WEBHOOK_SECRET missing). Refusing to process for safety — set the secret and configure it via Telegram's setWebhook(secret_token=...) before use.",
      },
      { status: 503 }
    );
  }

  const providedSecret = req.headers.get("x-telegram-bot-api-secret-token");
  if (providedSecret !== configuredSecret) {
    return NextResponse.json({ ok: false, error: "Invalid webhook secret" }, { status: 401 });
  }

  let update: TelegramUpdate;
  try {
    update = (await req.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const cq = update?.callback_query;
  if (!cq) {
    // Not a callback we care about (e.g. a plain text message to the bot).
    return NextResponse.json({ ok: true, ignored: true });
  }

  const data: string = cq.data ?? "";
  const [action, orderId] = data.split(":");
  const actor =
    cq.from?.username || cq.from?.first_name || `telegram:${cq.from?.id ?? "unknown"}`;

  if ((action !== "approve" && action !== "reject") || !orderId) {
    await answerCallback(cq.id, "Unrecognized action.");
    return NextResponse.json({ ok: true, ignored: true });
  }

  const decision = action === "approve" ? "APPROVED" : "REJECTED";

  try {
    await reviewOrder(orderId, decision, actor);
    await answerCallback(cq.id, `Order ${decision.toLowerCase()}.`);
    if (cq.message?.chat?.id && cq.message?.message_id) {
      await editMessageAfterDecision(cq.message.chat.id, cq.message.message_id, decision, actor);
    }
    return NextResponse.json({ ok: true, orderId, decision });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error("telegram_webhook.review_failed", { error: msg, orderId });
    await answerCallback(cq.id, `Failed: ${msg}`);
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}

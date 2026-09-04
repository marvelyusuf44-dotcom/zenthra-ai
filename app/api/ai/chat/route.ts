import { NextRequest, NextResponse } from "next/server";
import { ChatRequestSchema } from "@/src/utils/validation";
import { handleChatTurn } from "@/src/agent/chatAgent";
import { logger } from "@/src/utils/logger";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/ai/chat
 * Body: { message: string, history?: {role, content}[] }
 *
 * Per AI_API_CONTRACT.md failure policy: if GEMINI_API_KEY is missing or the
 * provider fails, this endpoint returns ok:false with the deterministic
 * scan result (if one was triggered) rather than fabricating a reply.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = ChatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const result = await handleChatTurn(parsed.data.message, parsed.data.history);
    return NextResponse.json(result, { status: result.ok ? 200 : 502 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error("ai_chat.failed", { error: msg });
    return NextResponse.json(
      { ok: false, reply: null, error: msg, degraded: true },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { FuturesScanRequestSchema } from "@/src/utils/validation";
import { runFuturesScan } from "@/src/agent/orchestrator";
import { logger } from "@/src/utils/logger";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/intelligence/futures/scan
 *
 * Body: { "query"?: string, "symbols"?: string[] }
 *
 * Runs the deterministic Futures Intelligence pipeline (see
 * src/agent/orchestrator.ts). This endpoint does not call the AI provider —
 * it works independently of Gemini per BLUEPRINT.md §10 ("the futures
 * engine must work independently from the chat UI").
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const parsed = FuturesScanRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid request",
        details: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  try {
    const result = await runFuturesScan(parsed.data.query, parsed.data.symbols);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error("futures_scan.failed", { error: msg });
    return NextResponse.json(
      {
        ok: false,
        query: parsed.data.query,
        timestamp: new Date().toISOString(),
        universe: [],
        candidates: [],
        setups: [],
        noTrade: [],
        dataQuality: { symbolsScanned: 0, symbolsFailed: 0, notes: [] },
        error: `Futures scan failed: ${msg}`,
      },
      { status: 502 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      ok: false,
      error: "Use POST with a JSON body, e.g. { \"query\": \"Find interesting futures opportunities right now\" }",
    },
    { status: 405 }
  );
}

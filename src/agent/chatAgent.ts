import type { AIProvider, ChatTurn } from "@/src/agent/aiProvider";
import { GeminiProvider } from "@/src/agent/geminiProvider";
import { extractSymbolsFromQuery } from "@/src/agent/intent";
import { runFuturesScan } from "@/src/agent/orchestrator";
import type { FuturesScanResult } from "@/src/types";
import { logger } from "@/src/utils/logger";

/**
 * Factory kept separate from the class so callers depend on AIProvider, not
 * GeminiProvider directly (AI_API_CONTRACT.md "Model abstraction").
 */
function getProvider(): AIProvider {
  const providerName = process.env.AI_PROVIDER || "google";
  if (providerName === "google") return new GeminiProvider();
  // Only Google is implemented in V1; unknown providers fail loudly rather
  // than silently falling back, so misconfiguration is visible.
  throw new Error(`Unsupported AI_PROVIDER: ${providerName}`);
}

const SYSTEM_PROMPT = `You are Zenthra AI, an on-chain and futures market intelligence assistant.

STRICT RULES:
- You are an orchestration and explanation layer only. You never invent prices, scores, wallet addresses, entities, open interest, funding rates, liquidations, or entry/stop-loss/take-profit levels.
- All quantitative findings you reference will be provided to you as already-computed tool results in the message context. Only describe numbers that appear there.
- If a requested type of data (e.g. wallet discovery, on-chain activity, liquidations) is marked unavailable/not implemented in the provided context, say plainly that it is not available in V1 — do not guess or approximate it.
- Structure your answers as: Finding, Evidence, Interpretation, Conflict (if any), Decision (LONG/SHORT/WATCH/NO TRADE), Risk.
- NO TRADE is a valid and often correct answer. Never imply guaranteed profit or a specific probability of profit.
- Be concise and factual. Do not use hype language.`;

export interface ChatResult {
  ok: boolean;
  reply: string | null;
  scan?: FuturesScanResult;
  error?: string;
  degraded: boolean;
}

/**
 * Handles one chat turn. If the message looks like a futures-intelligence
 * question, runs the deterministic scan first (tools remain the source of
 * truth) and only then asks Gemini to explain the structured result.
 * If Gemini is unavailable, the deterministic result is still returned —
 * never fabricated to hide the AI failure (AI_API_CONTRACT.md).
 */
export async function handleChatTurn(
  message: string,
  history: ChatTurn[]
): Promise<ChatResult> {
  const looksLikeFutures =
    /futures|setup|long|short|opportunit|trade|entry|scan/i.test(message) ||
    extractSymbolsFromQuery(message).length > 0;

  let scan: FuturesScanResult | undefined;
  if (looksLikeFutures) {
    try {
      const symbols = extractSymbolsFromQuery(message);
      scan = await runFuturesScan(message, symbols.length > 0 ? symbols : undefined);
    } catch (err) {
      logger.error("chatAgent.scan_failed", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  let provider: AIProvider;
  try {
    provider = getProvider();
  } catch (err) {
    return {
      ok: false,
      reply: null,
      scan,
      error: err instanceof Error ? err.message : String(err),
      degraded: true,
    };
  }

  const contextBlock = scan
    ? `\n\n[Deterministic futures scan result — treat as ground truth, do not contradict or re-derive]\n${JSON.stringify(
        summarizeForModel(scan)
      )}`
    : "";

  const response = await provider.generate(
    SYSTEM_PROMPT,
    history,
    `${message}${contextBlock}`
  );

  if (!response.ok) {
    return {
      ok: false,
      reply: null,
      scan,
      error: response.error,
      degraded: true,
    };
  }

  return { ok: true, reply: response.text, scan, degraded: false };
}

/** Keep the payload sent to the model compact and strip fields the model
 *  should not be tempted to "complete" (e.g. raw evidence arrays). */
function summarizeForModel(scan: FuturesScanResult) {
  return {
    query: scan.query,
    universe: scan.universe,
    dataQuality: scan.dataQuality,
    topCandidates: scan.candidates.slice(0, 5).map((c) => ({
      symbol: c.symbol,
      score: c.totalScore,
      classification: c.classification,
      direction: c.direction,
      conflicts: c.conflicts.map((cf) => cf.description),
      risk: c.risk,
      componentScores: c.components.map((comp) => ({
        label: comp.label,
        score: comp.score,
        weight: comp.weight,
        omitted: comp.omitted,
        rationale: comp.rationale,
      })),
    })),
  };
}

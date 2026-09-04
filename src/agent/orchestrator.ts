import { V1_UNIVERSE } from "@/src/types";
import type { CandidateResult, FuturesScanResult, EvidenceItem } from "@/src/types";

import { marketTickerBatch } from "@/src/tools/marketTicker";
import { ohlcv } from "@/src/tools/ohlcv";
import { volumeAnalysis } from "@/src/tools/volumeAnalysis";
import { openInterest } from "@/src/tools/openInterest";
import { openInterestHistory } from "@/src/tools/openInterestHistory";
import { fundingRate } from "@/src/tools/fundingRate";
import { liquidationData } from "@/src/tools/liquidationData";
import { marketStructure } from "@/src/tools/marketStructure";
import { onchainActivity } from "@/src/tools/onchainActivity";
import { marketContext } from "@/src/tools/marketContext";

import { computeConfluenceScore } from "@/src/scoring/confluence";
import { detectConflicts, applyConflictPenalty } from "@/src/scoring/conflicts";
import { decideDirection, computeRiskLevels } from "@/src/risk/riskEngine";
import { toEvidenceItem } from "@/src/context/researchContext";
import { extractSymbolsFromQuery } from "@/src/agent/intent";
import { logger } from "@/src/utils/logger";

const CANDIDATE_TIMEFRAME = "4h";
const CANDLE_LIMIT = 120;

/**
 * Runs the full Futures Intelligence pipeline:
 * USER QUESTION → INTENT → RESEARCH PLAN → MARKET SCAN → CANDIDATE DETECTION
 * → DERIVATIVES → MARKET STRUCTURE → ON-CHAIN → CONTEXT → CROSS-CHECK →
 * CONFLUENCE SCORE → LONG/SHORT/NO TRADE → SETUP → EVIDENCE
 *
 * Fully deterministic — no LLM call happens in this file. The AI layer
 * (src/agent/chatAgent.ts) calls this function as a tool and only adds
 * natural-language explanation on top of its output.
 */
export async function runFuturesScan(
  query: string,
  requestedSymbols?: string[]
): Promise<FuturesScanResult> {
  const timestamp = new Date().toISOString();

  // INTENT — deterministic keyword/symbol extraction from the query.
  const impliedSymbols = extractSymbolsFromQuery(query);
  const universe =
    requestedSymbols && requestedSymbols.length > 0
      ? requestedSymbols
      : impliedSymbols.length > 0
      ? impliedSymbols
      : [...V1_UNIVERSE];

  // MARKET SCAN — first pass, cheap ticker call across the candidate universe.
  const tickers = await marketTickerBatch(universe);

  const notes: string[] = [];
  let symbolsFailed = 0;

  const candidates: CandidateResult[] = [];

  // CANDIDATE DETECTION → DERIVATIVES → MARKET STRUCTURE → ON-CHAIN →
  // CONTEXT → CROSS-CHECK — run per symbol. Kept sequential-ish via
  // Promise.all per symbol group to respect rate limits on the free API.
  for (const symbol of universe) {
    const tickerEnv = tickers[symbol];
    if (!tickerEnv.ok || !tickerEnv.data) {
      symbolsFailed += 1;
      notes.push(`${symbol}: skipped — ${tickerEnv.error ?? "ticker unavailable"}`);
      continue;
    }

    try {
      const [candlesEnv, oiEnv, oiHistEnv, fundingEnv, liqEnv, onchainEnv, contextEnv] =
        await Promise.all([
          ohlcv(symbol, CANDIDATE_TIMEFRAME, CANDLE_LIMIT),
          openInterest(symbol),
          openInterestHistory(symbol, "1h", 24),
          fundingRate(symbol),
          liquidationData(symbol),
          onchainActivity(symbol.replace("USDT", ""), "unspecified"),
          marketContext(symbol),
        ]);

      const structureEnv = candlesEnv.ok && candlesEnv.data
        ? marketStructure(symbol, candlesEnv.data, CANDIDATE_TIMEFRAME)
        : { ok: false, source: "derived-from-ohlcv", timestamp, data: null, error: candlesEnv.error };

      const volumeEnv = candlesEnv.ok && candlesEnv.data
        ? volumeAnalysis(symbol, candlesEnv.data)
        : { ok: false, source: "derived-from-ohlcv", timestamp, data: null, error: candlesEnv.error };

      // CONFLUENCE SCORE
      const confluence = computeConfluenceScore({
        marketStructure: structureEnv as any,
        volumeAnalysis: volumeEnv as any,
        openInterest: oiEnv,
        openInterestHistory: oiHistEnv,
        fundingRate: fundingEnv,
        liquidationData: liqEnv,
        marketContext: contextEnv,
        onchainActivity: onchainEnv,
        priceChangePercent24h: tickerEnv.data.priceChangePercent,
      });

      // CROSS-CHECK / CONFLICT DETECTOR
      const conflicts = detectConflicts({
        marketStructure: structureEnv as any,
        openInterestHistory: oiHistEnv,
        fundingRate: fundingEnv,
        priceChangePercent24h: tickerEnv.data.priceChangePercent,
      });
      const adjustedScore = applyConflictPenalty(confluence.totalScore, conflicts);

      // LONG / SHORT / NO TRADE
      const trend = structureEnv.ok ? (structureEnv.data as any)?.trend : undefined;
      const direction = decideDirection(adjustedScore, trend);
      const classification =
        direction === "NO_TRADE" ? "NO_TRADE" : confluence.classification;

      // SETUP (risk engine) — only for LONG/SHORT.
      const risk = computeRiskLevels(direction, tickerEnv.data.lastPrice, structureEnv as any);

      // EVIDENCE
      const evidence: EvidenceItem[] = [
        toEvidenceItem("market_ticker", tickerEnv, (d) => `Last ${d.lastPrice}, 24h ${d.priceChangePercent.toFixed(2)}%`),
        toEvidenceItem("ohlcv", candlesEnv, (d) => `${d.length} candles on ${CANDIDATE_TIMEFRAME}`),
        toEvidenceItem("market_structure", structureEnv as any, (d: any) => `Trend: ${d.trend}, ATR%: ${d.volatilityPercent?.toFixed(2) ?? "n/a"}`),
        toEvidenceItem("volume_analysis", volumeEnv as any, (d: any) => `Relative volume ${d.relativeVolume.toFixed(2)}x`),
        toEvidenceItem("open_interest", oiEnv, (d) => `OI ${d.openInterest.toLocaleString()}`),
        toEvidenceItem("open_interest_history", oiHistEnv, (d) => `Trend: ${d.trend} (${d.changePercent?.toFixed(1) ?? "n/a"}%)`),
        toEvidenceItem("funding_rate", fundingEnv, (d) => `${(d.lastFundingRate * 100).toFixed(4)}%`),
        toEvidenceItem("liquidation_data", liqEnv, () => "n/a"),
        toEvidenceItem("onchain_activity", onchainEnv, () => "n/a"),
        toEvidenceItem("market_context", contextEnv, (d) => d.summary ?? "no context"),
      ];

      candidates.push({
        symbol,
        totalScore: adjustedScore,
        classification,
        direction,
        components: confluence.components,
        conflicts,
        risk,
        evidence,
        dataQualityAverage:
          confluence.components.find((c) => c.key === "dataQuality")?.score ?? 0,
      });
    } catch (err) {
      symbolsFailed += 1;
      const msg = err instanceof Error ? err.message : String(err);
      notes.push(`${symbol}: failed deep investigation — ${msg}`);
      logger.warn("futures_scan.symbol_failed", { symbol, error: msg });
    }
  }

  candidates.sort((a, b) => b.totalScore - a.totalScore);

  const setups = candidates.filter((c) => c.classification !== "NO_TRADE");
  const noTrade = candidates.filter((c) => c.classification === "NO_TRADE");

  return {
    ok: true,
    query,
    timestamp,
    universe,
    candidates,
    setups,
    noTrade,
    dataQuality: {
      symbolsScanned: universe.length,
      symbolsFailed,
      notes,
    },
  };
}

import type { Direction, MarketStructureData, RiskLevels, ToolEnvelope } from "@/src/types";

/**
 * Risk engine (BLUEPRINT.md §7).
 *
 * Levels are derived exclusively from market_structure output (swing
 * high/low, ATR, EMA) — real numbers computed from real candles. The LLM
 * never sees this function's internals and never invents entry/SL/TP; it
 * only explains the numbers this function already produced.
 *
 * Method (documented so it is inspectable/evaluable, per the blueprint's
 * "treat as a V1 model, not a probability" instruction):
 *  - LONG: entry zone = last close down to nearest structure support
 *    (swing low or 1x ATR below close, whichever is closer/tighter);
 *    invalidation = swing low - 0.5x ATR; TP1 = entry + 1x risk; TP2 =
 *    entry + 2x risk (risk = entry - invalidation).
 *  - SHORT: mirrored against swing high.
 *  - NO_TRADE: no levels are produced at all.
 */
export function computeRiskLevels(
  direction: Direction,
  lastClose: number,
  structureEnv: ToolEnvelope<MarketStructureData>
): RiskLevels | null {
  if (direction === "NO_TRADE") return null;
  if (!structureEnv.ok || !structureEnv.data) return null;

  const { swingHigh, swingLow, atr } = structureEnv.data;
  if (swingHigh === null || swingLow === null || atr === null || atr <= 0) {
    return null;
  }

  if (direction === "LONG") {
    const structuralSupport = swingLow;
    const atrSupport = lastClose - atr;
    const entryZoneLow = Math.max(structuralSupport, atrSupport);
    const entryZoneHigh = lastClose;
    const invalidation = swingLow - atr * 0.5;
    const entry = (entryZoneLow + entryZoneHigh) / 2;
    const risk = entry - invalidation;

    if (risk <= 0) return null;

    const tp1 = entry + risk * 1;
    const tp2 = entry + risk * 2;

    return {
      direction,
      entryZoneLow: round(entryZoneLow),
      entryZoneHigh: round(entryZoneHigh),
      invalidation: round(invalidation),
      tp1: round(tp1),
      tp2: round(tp2),
      riskRewardTp1: 1,
      riskRewardTp2: 2,
      derivedFrom: `swing low ${round(swingLow)}, ATR ${round(atr)} on the analyzed timeframe`,
    };
  }

  // SHORT
  const structuralResistance = swingHigh;
  const atrResistance = lastClose + atr;
  const entryZoneHigh = Math.min(structuralResistance, atrResistance);
  const entryZoneLow = lastClose;
  const invalidation = swingHigh + atr * 0.5;
  const entry = (entryZoneLow + entryZoneHigh) / 2;
  const risk = invalidation - entry;

  if (risk <= 0) return null;

  const tp1 = entry - risk * 1;
  const tp2 = entry - risk * 2;

  return {
    direction,
    entryZoneLow: round(Math.min(entryZoneLow, entryZoneHigh)),
    entryZoneHigh: round(Math.max(entryZoneLow, entryZoneHigh)),
    invalidation: round(invalidation),
    tp1: round(tp1),
    tp2: round(tp2),
    riskRewardTp1: 1,
    riskRewardTp2: 2,
    derivedFrom: `swing high ${round(swingHigh)}, ATR ${round(atr)} on the analyzed timeframe`,
  };
}

/**
 * Direction decision — deterministic, based on trend + score, never the LLM.
 * A high score with no clear trend still resolves to NO_TRADE: confluence
 * alone does not imply a side to take.
 */
export function decideDirection(
  totalScore: number,
  trend: MarketStructureData["trend"] | undefined
): Direction {
  if (totalScore < 55) return "NO_TRADE";
  if (trend === "uptrend") return "LONG";
  if (trend === "downtrend") return "SHORT";
  return "NO_TRADE"; // range/unknown trend: no directional conviction regardless of score
}

function round(v: number): number {
  // Keep reasonable precision without implying false accuracy.
  if (v >= 1000) return Math.round(v * 100) / 100;
  if (v >= 1) return Math.round(v * 10000) / 10000;
  return Math.round(v * 1e8) / 1e8;
}

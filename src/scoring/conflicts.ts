import type {
  ConflictFlag,
  ConfluenceComponentScore,
  MarketStructureData,
  OpenInterestHistoryData,
  FundingRateData,
  ToolEnvelope,
} from "@/src/types";

/**
 * Deterministic conflict detector (BLUEPRINT.md §6).
 *
 * Example from the blueprint: bullish price structure + rising OI + crowded
 * funding + on-chain distribution = mixed evidence, not an artificially
 * strong LONG. This module encodes that kind of rule explicitly, as plain
 * comparisons — no LLM judgment involved.
 */

export interface ConflictInputs {
  marketStructure: ToolEnvelope<MarketStructureData>;
  openInterestHistory: ToolEnvelope<OpenInterestHistoryData>;
  fundingRate: ToolEnvelope<FundingRateData>;
  priceChangePercent24h: number | null;
}

export function detectConflicts(inputs: ConflictInputs): ConflictFlag[] {
  const flags: ConflictFlag[] = [];

  const trend = inputs.marketStructure.ok ? inputs.marketStructure.data?.trend : undefined;
  const oiTrend = inputs.openInterestHistory.ok
    ? inputs.openInterestHistory.data?.trend
    : undefined;
  const funding = inputs.fundingRate.ok ? inputs.fundingRate.data?.lastFundingRate : undefined;
  const priceChange = inputs.priceChangePercent24h;

  // 1. Bullish structure + rising OI + crowded positive funding = crowded long, squeeze risk.
  if (
    trend === "uptrend" &&
    oiTrend === "expanding" &&
    funding !== undefined &&
    funding > 0.0006
  ) {
    flags.push({
      code: "CROWDED_LONG_FUNDING",
      description:
        "Uptrend with expanding open interest and elevated positive funding — positioning is crowded long, raising long-squeeze risk even though structure looks bullish.",
      severity: "high",
    });
  }

  // 2. Bearish structure + rising OI + crowded negative funding = crowded short, squeeze risk.
  if (
    trend === "downtrend" &&
    oiTrend === "expanding" &&
    funding !== undefined &&
    funding < -0.0006
  ) {
    flags.push({
      code: "CROWDED_SHORT_FUNDING",
      description:
        "Downtrend with expanding open interest and deeply negative funding — positioning is crowded short, raising short-squeeze risk even though structure looks bearish.",
      severity: "high",
    });
  }

  // 3. Price up strongly but OI contracting = move driven by closing shorts, not fresh conviction.
  if (
    priceChange !== null &&
    priceChange !== undefined &&
    priceChange > 3 &&
    oiTrend === "contracting"
  ) {
    flags.push({
      code: "RALLY_WITHOUT_FRESH_POSITIONING",
      description:
        "Price rising while open interest contracts — the move looks driven by short-covering rather than new long conviction.",
      severity: "medium",
    });
  }

  // 4. Price down strongly but OI contracting = move driven by long liquidation/closing, not fresh shorts.
  if (
    priceChange !== null &&
    priceChange !== undefined &&
    priceChange < -3 &&
    oiTrend === "contracting"
  ) {
    flags.push({
      code: "SELLOFF_WITHOUT_FRESH_POSITIONING",
      description:
        "Price falling while open interest contracts — the move looks driven by long unwinding rather than new short conviction.",
      severity: "medium",
    });
  }

  // 5. Structure says range but volatility is elevated — unreliable read.
  if (
    trend === "range" &&
    inputs.marketStructure.ok &&
    (inputs.marketStructure.data?.volatilityPercent ?? 0) > 6
  ) {
    flags.push({
      code: "CHOPPY_RANGE",
      description:
        "No clear trend detected alongside elevated volatility — conditions are choppy, reducing confidence in any directional setup.",
      severity: "medium",
    });
  }

  return flags;
}

/**
 * Applies a deterministic conviction penalty to the confluence score based
 * on detected conflicts. Keeps the penalty logic out of the LLM entirely.
 */
export function applyConflictPenalty(
  score: number,
  conflicts: ConflictFlag[]
): number {
  let penalty = 0;
  for (const c of conflicts) {
    if (c.severity === "high") penalty += 12;
    else if (c.severity === "medium") penalty += 6;
    else penalty += 2;
  }
  return Math.max(0, Math.round((score - penalty) * 10) / 10);
}

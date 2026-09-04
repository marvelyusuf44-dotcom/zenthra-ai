import type {
  ConfluenceComponentScore,
  ConfluenceComponentKey,
  Classification,
  MarketStructureData,
  VolumeAnalysisData,
  OpenInterestData,
  OpenInterestHistoryData,
  FundingRateData,
  LiquidationData,
  MarketContextData,
  OnchainActivityData,
  ToolEnvelope,
} from "@/src/types";

/**
 * Deterministic confluence scoring engine.
 *
 * This file contains NO network calls and NO LLM calls. Every component
 * score is a pure function of already-fetched tool data. This is the piece
 * of the system CLAUDE_INSTRUCTIONS.md / AI_API_CONTRACT.md refer to when
 * they say "deterministic calculations belong outside the LLM" — the AI
 * layer is never allowed to touch these numbers.
 *
 * Weights (BLUEPRINT.md §5):
 *   Market Structure   20
 *   Momentum/Volume     15
 *   Open Interest       15
 *   Funding             10
 *   Liquidations        10
 *   On-chain            15
 *   Market/News Context 10
 *   Data Quality         5
 *   Total               100
 *
 * V1 has two components that are structurally omitted for every symbol
 * (Liquidations 10pts, On-chain 15pts — see tools/liquidationData.ts and
 * tools/onchainActivity.ts for why). IMPORTANT SCORING DECISION: omitted
 * components score 0 and are NOT rescaled away. This means the maximum
 * score any V1 symbol can reach is 100 - 10 - 15 = 75, which structurally
 * caps every result at WATCH or below on the blueprint's own thresholds
 * (80-100 STRONG_SETUP and 70-79 VALID_SETUP become unreachable until
 * those two tools are implemented).
 *
 * This was a deliberate choice, not an oversight: rescaling the score over
 * only the available components would let a symbol with 25 points of
 * missing evidence look identical to one with full evidence, which
 * contradicts "NO TRADE must be valid" and risks presenting a
 * lower-confidence read as a high-confidence one. The honest, disclosed cap
 * was preferred over an inflated number. See docs/ACCEPTANCE_CRITERIA.md
 * discussion in the final report for how to lift this in V1.1 once
 * liquidation/on-chain sources are wired.
 */

export const CONFLUENCE_WEIGHTS: Record<ConfluenceComponentKey, number> = {
  marketStructure: 20,
  momentumVolume: 15,
  openInterest: 15,
  funding: 10,
  liquidations: 10,
  onchain: 15,
  marketContext: 10,
  dataQuality: 5,
};

export interface ConfluenceInputs {
  marketStructure: ToolEnvelope<MarketStructureData>;
  volumeAnalysis: ToolEnvelope<VolumeAnalysisData>;
  openInterest: ToolEnvelope<OpenInterestData>;
  openInterestHistory: ToolEnvelope<OpenInterestHistoryData>;
  fundingRate: ToolEnvelope<FundingRateData>;
  liquidationData: ToolEnvelope<LiquidationData>;
  marketContext: ToolEnvelope<MarketContextData>;
  onchainActivity: ToolEnvelope<OnchainActivityData>;
  priceChangePercent24h: number | null;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function scoreMarketStructure(
  inputs: ConfluenceInputs
): ConfluenceComponentScore {
  const weight = CONFLUENCE_WEIGHTS.marketStructure;
  const env = inputs.marketStructure;
  if (!env.ok || !env.data) {
    return {
      key: "marketStructure",
      label: "Market Structure",
      weight,
      score: 0,
      rationale: `Unavailable: ${env.error ?? "no structure data"}`,
      omitted: true,
    };
  }
  const { trend, volatilityPercent } = env.data;
  let score = weight * 0.5; // neutral baseline for "range"
  let rationale = "Range-bound structure — neutral.";
  if (trend === "uptrend") {
    score = weight * 0.85;
    rationale = "Price above fast/slow EMA with EMA fast > EMA slow — structural uptrend.";
  } else if (trend === "downtrend") {
    score = weight * 0.85;
    rationale = "Price below fast/slow EMA with EMA fast < EMA slow — structural downtrend.";
  }
  // Excessive volatility reduces reliability of the structure read.
  if (volatilityPercent !== null && volatilityPercent > 8) {
    score *= 0.8;
    rationale += ` High volatility (${volatilityPercent.toFixed(1)}% ATR) reduces reliability.`;
  }
  return {
    key: "marketStructure",
    label: "Market Structure",
    weight,
    score: clamp(score, 0, weight),
    rationale,
    omitted: false,
  };
}

function scoreMomentumVolume(
  inputs: ConfluenceInputs
): ConfluenceComponentScore {
  const weight = CONFLUENCE_WEIGHTS.momentumVolume;
  const env = inputs.volumeAnalysis;
  if (!env.ok || !env.data) {
    return {
      key: "momentumVolume",
      label: "Momentum / Volume",
      weight,
      score: 0,
      rationale: `Unavailable: ${env.error ?? "no volume data"}`,
      omitted: true,
    };
  }
  const { relativeVolume } = env.data;
  // relativeVolume 1.0 = average. Score scales with how far above average.
  const ratioScore = clamp((relativeVolume - 0.8) / 1.7, 0, 1); // 0.8x->0, 2.5x->1
  const priceChange = inputs.priceChangePercent24h ?? 0;
  const momentumBonus = clamp(Math.abs(priceChange) / 10, 0, 1); // 10%+ move = full bonus
  const combined = ratioScore * 0.7 + momentumBonus * 0.3;
  return {
    key: "momentumVolume",
    label: "Momentum / Volume",
    weight,
    score: clamp(combined * weight, 0, weight),
    rationale: `Relative volume ${relativeVolume.toFixed(2)}x average; 24h price change ${priceChange.toFixed(2)}%.`,
    omitted: false,
  };
}

function scoreOpenInterest(inputs: ConfluenceInputs): ConfluenceComponentScore {
  const weight = CONFLUENCE_WEIGHTS.openInterest;
  const oiEnv = inputs.openInterest;
  const histEnv = inputs.openInterestHistory;
  if (!oiEnv.ok || !oiEnv.data) {
    return {
      key: "openInterest",
      label: "Open Interest",
      weight,
      score: 0,
      rationale: `Unavailable: ${oiEnv.error ?? "no OI data"}`,
      omitted: true,
    };
  }
  let score = weight * 0.5;
  let rationale = `Current open interest ${oiEnv.data.openInterest.toLocaleString()} contracts.`;
  if (histEnv.ok && histEnv.data) {
    if (histEnv.data.trend === "expanding") {
      score = weight * 0.85;
      rationale += ` OI expanding (${histEnv.data.changePercent?.toFixed(1)}%) — fresh positioning building.`;
    } else if (histEnv.data.trend === "contracting") {
      score = weight * 0.35;
      rationale += ` OI contracting (${histEnv.data.changePercent?.toFixed(1)}%) — positioning unwinding.`;
    } else {
      rationale += " OI roughly flat.";
    }
  } else {
    rationale += " OI history unavailable — using current OI only (reduced confidence).";
    score *= 0.8;
  }
  return {
    key: "openInterest",
    label: "Open Interest",
    weight,
    score: clamp(score, 0, weight),
    rationale,
    omitted: false,
  };
}

function scoreFunding(inputs: ConfluenceInputs): ConfluenceComponentScore {
  const weight = CONFLUENCE_WEIGHTS.funding;
  const env = inputs.fundingRate;
  if (!env.ok || !env.data) {
    return {
      key: "funding",
      label: "Funding",
      weight,
      score: 0,
      rationale: `Unavailable: ${env.error ?? "no funding data"}`,
      omitted: true,
    };
  }
  const rate = env.data.lastFundingRate;
  const absRate = Math.abs(rate);
  // Funding is contextual, not directional on its own: moderate funding in
  // either direction is healthiest; extreme funding signals a crowded trade
  // (higher risk of squeeze against the crowd), which we treat as *lower*
  // confluence quality, not automatically bearish/bullish.
  let score: number;
  if (absRate < 0.0002) score = weight * 0.9; // near-neutral funding
  else if (absRate < 0.0006) score = weight * 0.6; // moderate
  else score = weight * 0.25; // crowded / extreme

  return {
    key: "funding",
    label: "Funding",
    weight,
    score: clamp(score, 0, weight),
    rationale: `Last funding rate ${(rate * 100).toFixed(4)}% — ${
      absRate < 0.0002 ? "near neutral" : absRate < 0.0006 ? "moderate" : "crowded/extreme"
    } positioning.`,
    omitted: false,
  };
}

function scoreLiquidations(inputs: ConfluenceInputs): ConfluenceComponentScore {
  const weight = CONFLUENCE_WEIGHTS.liquidations;
  const env = inputs.liquidationData;
  // V1: always omitted (no free source). See tools/liquidationData.ts.
  return {
    key: "liquidations",
    label: "Liquidations",
    weight,
    score: 0,
    rationale: env.error ?? "Not available in V1 (no free public aggregate liquidation feed).",
    omitted: true,
  };
}

function scoreOnchain(inputs: ConfluenceInputs): ConfluenceComponentScore {
  const weight = CONFLUENCE_WEIGHTS.onchain;
  const env = inputs.onchainActivity;
  // V1: always omitted (no free reliable source). See tools/onchainActivity.ts.
  return {
    key: "onchain",
    label: "On-chain",
    weight,
    score: 0,
    rationale: env.error ?? "Not available in V1 (no free reliable on-chain activity source).",
    omitted: true,
  };
}

function scoreMarketContext(inputs: ConfluenceInputs): ConfluenceComponentScore {
  const weight = CONFLUENCE_WEIGHTS.marketContext;
  const env = inputs.marketContext;
  if (!env.ok || !env.data || !env.data.summary) {
    return {
      key: "marketContext",
      label: "Market / News Context",
      weight,
      score: 0,
      rationale: env.error ?? "No public context available.",
      omitted: true,
    };
  }
  // Presence of verifiable context is itself the signal (V1 does not
  // attempt sentiment scoring of news text — that would risk the LLM
  // inventing interpretation of unverified content).
  const trending = env.data.summary.includes("trending");
  const score = trending ? weight * 0.9 : weight * 0.6;
  return {
    key: "marketContext",
    label: "Market / News Context",
    weight,
    score: clamp(score, 0, weight),
    rationale: env.data.summary,
    omitted: false,
  };
}

function scoreDataQuality(components: ConfluenceComponentScore[]): ConfluenceComponentScore {
  const weight = CONFLUENCE_WEIGHTS.dataQuality;
  const evaluated = components.filter((c) => c.key !== "dataQuality");
  const availableCount = evaluated.filter((c) => !c.omitted).length;
  const ratio = availableCount / evaluated.length;
  return {
    key: "dataQuality",
    label: "Data Quality",
    weight,
    score: clamp(ratio * weight, 0, weight),
    rationale: `${availableCount}/${evaluated.length} evidence components available for this symbol.`,
    omitted: false,
  };
}

export interface ConfluenceResult {
  components: ConfluenceComponentScore[];
  /** Sum of achieved points out of the fixed 100-point weight table. Omitted
   *  components contribute 0 — this is NOT rescaled. See file header. */
  totalScore: number;
  /** Sum of weights for components that were actually available this run. */
  availableWeight: number;
  /** Max score theoretically reachable given which components were available. */
  maxReachable: number;
  classification: Classification;
}

export function computeConfluenceScore(inputs: ConfluenceInputs): ConfluenceResult {
  const components: ConfluenceComponentScore[] = [
    scoreMarketStructure(inputs),
    scoreMomentumVolume(inputs),
    scoreOpenInterest(inputs),
    scoreFunding(inputs),
    scoreLiquidations(inputs),
    scoreOnchain(inputs),
    scoreMarketContext(inputs),
  ];
  components.push(scoreDataQuality(components));

  const totalScore = components.reduce((s, c) => s + c.score, 0);
  const available = components.filter((c) => !c.omitted);
  const availableWeight = available.reduce((s, c) => s + c.weight, 0);
  const maxReachable = availableWeight; // best case if every available component scored max

  return {
    components,
    totalScore: Math.round(clamp(totalScore, 0, 100) * 10) / 10,
    availableWeight,
    maxReachable,
    classification: classify(totalScore),
  };
}

export function classify(score: number): Classification {
  if (score >= 80) return "STRONG_SETUP";
  if (score >= 70) return "VALID_SETUP";
  if (score >= 55) return "WATCH";
  return "NO_TRADE";
}

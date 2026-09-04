// Zenthra V1 — Core shared types
// These types encode the contracts defined in docs/TOOL_CONTRACTS.md and BLUEPRINT.md.
// Nothing in this file should be treated as a place to store fabricated/example data.

export type ISODateString = string;

/**
 * Universal tool response envelope (docs/TOOL_CONTRACTS.md).
 * Every tool in src/tools MUST return this shape. `ok:false` is a first-class,
 * expected outcome — callers must handle it, never synthesize data to hide it.
 */
export interface ToolEnvelope<T> {
  ok: boolean;
  source: string; // provider name, e.g. "binance-futures", "coingecko"
  timestamp: ISODateString;
  data: T | null;
  error?: string;
  dataQuality?: DataQualityNote;
}

export interface DataQualityNote {
  /** 0-1, subjective confidence in this specific tool result, set deterministically by the tool. */
  confidence: number;
  /** Human-readable reason the data is degraded/omitted, if any. */
  reason?: string;
  /** Whether this evidence was omitted entirely from scoring. */
  omitted?: boolean;
}

export const V1_UNIVERSE = [
  "BTCUSDT",
  "ETHUSDT",
  "SOLUSDT",
  "BNBUSDT",
  "XRPUSDT",
  "DOGEUSDT",
  "SUIUSDT",
  "AVAXUSDT",
  "LINKUSDT",
  "ADAUSDT",
] as const;

export type Symbol = (typeof V1_UNIVERSE)[number];

export interface Candle {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
}

export interface MarketTickerData {
  symbol: string;
  lastPrice: number;
  priceChangePercent: number;
  quoteVolume: number;
}

export interface VolumeAnalysisData {
  symbol: string;
  currentVolume: number;
  averageVolume: number;
  relativeVolume: number; // currentVolume / averageVolume
}

export interface OpenInterestData {
  symbol: string;
  openInterest: number;
  openInterestValue?: number;
}

export interface OpenInterestHistoryPoint {
  timestamp: number;
  sumOpenInterest: number;
  sumOpenInterestValue: number;
}

export interface OpenInterestHistoryData {
  symbol: string;
  series: OpenInterestHistoryPoint[];
  trend: "expanding" | "contracting" | "flat" | "unknown";
  changePercent: number | null;
}

export interface FundingRateData {
  symbol: string;
  lastFundingRate: number; // decimal, e.g. 0.0001 = 0.01%
  nextFundingTime?: number;
}

export interface LiquidationData {
  symbol: string;
  window: string;
  longLiquidations: number | null;
  shortLiquidations: number | null;
}

export interface LongShortContextData {
  symbol: string;
  longShortRatio: number; // accounts ratio
  longAccountPercent: number;
  shortAccountPercent: number;
}

export interface MarketStructureData {
  symbol: string;
  timeframe: string;
  trend: "uptrend" | "downtrend" | "range" | "unknown";
  swingHigh: number | null;
  swingLow: number | null;
  atr: number | null;
  volatilityPercent: number | null;
  emaFast: number | null;
  emaSlow: number | null;
}

export interface OnchainActivityData {
  asset: string;
  chain: string;
  note: string;
}

export interface WalletCandidate {
  address: string;
  chain: string;
  reason: string;
}

export interface WalletDiscoveryData {
  asset: string;
  candidates: WalletCandidate[];
}

export interface WalletBehaviorData {
  wallet: string;
  asset: string;
  note: string;
}

export interface EntityLookupData {
  address: string;
  label: string | null;
}

export interface MarketContextData {
  symbol: string;
  summary: string | null;
  sourceUrls: string[];
}

// ---- Scoring / decision layer ----

export type ConfluenceComponentKey =
  | "marketStructure"
  | "momentumVolume"
  | "openInterest"
  | "funding"
  | "liquidations"
  | "onchain"
  | "marketContext"
  | "dataQuality";

export interface ConfluenceComponentScore {
  key: ConfluenceComponentKey;
  label: string;
  weight: number;
  score: number; // 0..weight
  rationale: string;
  omitted: boolean;
}

export type Direction = "LONG" | "SHORT" | "NO_TRADE";

export type Classification =
  | "STRONG_SETUP"
  | "VALID_SETUP"
  | "WATCH"
  | "NO_TRADE";

export interface ConflictFlag {
  code: string;
  description: string;
  severity: "low" | "medium" | "high";
}

export interface RiskLevels {
  direction: Direction;
  entryZoneLow: number | null;
  entryZoneHigh: number | null;
  invalidation: number | null;
  tp1: number | null;
  tp2: number | null;
  riskRewardTp1: number | null;
  riskRewardTp2: number | null;
  derivedFrom: string; // description of the structural inputs used
}

export interface EvidenceItem {
  tool: string;
  ok: boolean;
  source: string;
  summary: string;
  omitted: boolean;
}

export interface CandidateResult {
  symbol: string;
  totalScore: number;
  classification: Classification;
  direction: Direction;
  components: ConfluenceComponentScore[];
  conflicts: ConflictFlag[];
  risk: RiskLevels | null;
  evidence: EvidenceItem[];
  dataQualityAverage: number;
}

export interface FuturesScanResult {
  ok: boolean;
  query: string;
  timestamp: ISODateString;
  universe: string[];
  candidates: CandidateResult[];
  setups: CandidateResult[]; // classification !== NO_TRADE
  noTrade: CandidateResult[]; // classification === NO_TRADE
  dataQuality: {
    symbolsScanned: number;
    symbolsFailed: number;
    notes: string[];
  };
  error?: string;
}

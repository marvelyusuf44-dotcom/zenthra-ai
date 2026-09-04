// Static mapping for the fixed V1 universe (BLUEPRINT.md §5).
// Kept static and small on purpose — V1 does not do dynamic symbol resolution.
export const COINGECKO_ID_BY_SYMBOL: Record<string, string> = {
  BTCUSDT: "bitcoin",
  ETHUSDT: "ethereum",
  SOLUSDT: "solana",
  BNBUSDT: "binancecoin",
  XRPUSDT: "ripple",
  DOGEUSDT: "dogecoin",
  SUIUSDT: "sui",
  AVAXUSDT: "avalanche-2",
  LINKUSDT: "chainlink",
  ADAUSDT: "cardano",
};

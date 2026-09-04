import { V1_UNIVERSE } from "@/src/types";

/**
 * Deterministic, dependency-free intent parsing. This is the fallback path
 * used when the AI provider is unavailable (missing key / quota / timeout —
 * see AI_API_CONTRACT.md "Failure policy": deterministic endpoints must keep
 * working without Gemini). It is intentionally simple: extract any V1
 * universe symbols mentioned by name or ticker, otherwise scan the full
 * universe.
 */

const NAME_TO_SYMBOL: Record<string, string> = {
  bitcoin: "BTCUSDT",
  btc: "BTCUSDT",
  ethereum: "ETHUSDT",
  eth: "ETHUSDT",
  solana: "SOLUSDT",
  sol: "SOLUSDT",
  bnb: "BNBUSDT",
  binancecoin: "BNBUSDT",
  xrp: "XRPUSDT",
  ripple: "XRPUSDT",
  doge: "DOGEUSDT",
  dogecoin: "DOGEUSDT",
  sui: "SUIUSDT",
  avax: "AVAXUSDT",
  avalanche: "AVAXUSDT",
  link: "LINKUSDT",
  chainlink: "LINKUSDT",
  ada: "ADAUSDT",
  cardano: "ADAUSDT",
};

export function extractSymbolsFromQuery(query: string): string[] {
  const lower = query.toLowerCase();
  const found = new Set<string>();

  for (const [name, symbol] of Object.entries(NAME_TO_SYMBOL)) {
    const re = new RegExp(`\\b${name}\\b`, "i");
    if (re.test(lower)) found.add(symbol);
  }

  for (const symbol of V1_UNIVERSE) {
    if (lower.includes(symbol.toLowerCase())) found.add(symbol);
  }

  return Array.from(found);
}

import { fetchJson, ToolHttpError } from "@/src/utils/httpClient";
import { ok, fail } from "@/src/utils/toolEnvelope";
import type { ToolEnvelope, MarketTickerData } from "@/src/types";

const SOURCE = "binance-futures";
const BASE_URL = "https://fapi.binance.com/fapi/v1/ticker/24hr";

interface BinanceTickerRaw {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  quoteVolume: string;
}

/**
 * Tool: market_ticker(symbol)
 * Input: symbol (e.g. "BTCUSDT")
 * Output: price / 24h change / quote volume
 * When called: market scan (first pass over the V1 universe)
 * Allowed inference: momentum/activity only
 * Failure fallback: skip symbol
 */
export async function marketTicker(
  symbol: string
): Promise<ToolEnvelope<MarketTickerData>> {
  try {
    const raw = await fetchJson<BinanceTickerRaw>(
      `${BASE_URL}?symbol=${encodeURIComponent(symbol)}`,
      { timeoutMs: 5000, retries: 1 }
    );

    if (!raw || !raw.symbol) {
      return fail(SOURCE, `No ticker data returned for ${symbol}`);
    }

    return ok<MarketTickerData>(SOURCE, {
      symbol: raw.symbol,
      lastPrice: Number(raw.lastPrice),
      priceChangePercent: Number(raw.priceChangePercent),
      quoteVolume: Number(raw.quoteVolume),
    });
  } catch (err) {
    const msg = err instanceof ToolHttpError ? err.message : String(err);
    return fail(SOURCE, msg);
  }
}

/** Batched variant to avoid N sequential requests during a full universe scan. */
export async function marketTickerBatch(
  symbols: string[]
): Promise<Record<string, ToolEnvelope<MarketTickerData>>> {
  const results = await Promise.allSettled(symbols.map((s) => marketTicker(s)));
  const out: Record<string, ToolEnvelope<MarketTickerData>> = {};
  results.forEach((r, i) => {
    out[symbols[i]] =
      r.status === "fulfilled" ? r.value : fail(SOURCE, "Unexpected batch failure");
  });
  return out;
}

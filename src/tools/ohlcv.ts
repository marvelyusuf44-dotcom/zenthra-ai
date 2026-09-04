import { fetchJson, ToolHttpError } from "@/src/utils/httpClient";
import { ok, fail } from "@/src/utils/toolEnvelope";
import type { ToolEnvelope, Candle } from "@/src/types";

const SOURCE = "binance-futures";
const BASE_URL = "https://fapi.binance.com/fapi/v1/klines";

// Binance kline array shape:
// [openTime, open, high, low, close, volume, closeTime, quoteVolume, trades, ...]
type BinanceKlineRaw = [
  number,
  string,
  string,
  string,
  string,
  string,
  number,
  string,
  number,
  string,
  string,
  string
];

/**
 * Tool: ohlcv(symbol, timeframe, limit)
 * Input: symbol, timeframe (e.g. "1h","4h","1d"), limit (candle count)
 * Output: candle array
 * When called: candidate deep-dive
 * Allowed inference: trend/structure inputs
 * Failure fallback: retry / alternate timeframe (caller decides)
 */
export async function ohlcv(
  symbol: string,
  timeframe: string,
  limit: number = 100
): Promise<ToolEnvelope<Candle[]>> {
  const boundedLimit = Math.min(Math.max(limit, 10), 500);
  try {
    const raw = await fetchJson<BinanceKlineRaw[]>(
      `${BASE_URL}?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(
        timeframe
      )}&limit=${boundedLimit}`,
      { timeoutMs: 6000, retries: 1 }
    );

    if (!Array.isArray(raw) || raw.length === 0) {
      return fail(SOURCE, `No candles returned for ${symbol} ${timeframe}`);
    }

    const candles: Candle[] = raw.map((k) => ({
      openTime: k[0],
      open: Number(k[1]),
      high: Number(k[2]),
      low: Number(k[3]),
      close: Number(k[4]),
      volume: Number(k[5]),
      closeTime: k[6],
    }));

    return ok<Candle[]>(SOURCE, candles);
  } catch (err) {
    const msg = err instanceof ToolHttpError ? err.message : String(err);
    return fail(SOURCE, msg);
  }
}

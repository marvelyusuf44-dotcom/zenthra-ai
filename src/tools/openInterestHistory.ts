import { fetchJson, ToolHttpError } from "@/src/utils/httpClient";
import { ok, fail } from "@/src/utils/toolEnvelope";
import type {
  ToolEnvelope,
  OpenInterestHistoryData,
  OpenInterestHistoryPoint,
} from "@/src/types";

const SOURCE = "binance-futures";
const BASE_URL = "https://fapi.binance.com/futures/data/openInterestHist";

interface BinanceOIHistRaw {
  symbol: string;
  sumOpenInterest: string;
  sumOpenInterestValue: string;
  timestamp: number;
}

/**
 * Tool: open_interest_history(symbol, timeframe)
 * Output: OI series over a window
 * When called: deep investigation only (not the first-pass scan)
 * Allowed inference: OI expansion/contraction
 * Failure fallback: fall back to current OI only (caller's responsibility)
 */
export async function openInterestHistory(
  symbol: string,
  timeframe: string = "1h",
  limit: number = 30
): Promise<ToolEnvelope<OpenInterestHistoryData>> {
  try {
    const raw = await fetchJson<BinanceOIHistRaw[]>(
      `${BASE_URL}?symbol=${encodeURIComponent(symbol)}&period=${encodeURIComponent(
        timeframe
      )}&limit=${Math.min(Math.max(limit, 5), 500)}`,
      { timeoutMs: 6000, retries: 1 }
    );

    if (!Array.isArray(raw) || raw.length < 2) {
      return fail(SOURCE, `Insufficient OI history for ${symbol}`);
    }

    const series: OpenInterestHistoryPoint[] = raw.map((p) => ({
      timestamp: p.timestamp,
      sumOpenInterest: Number(p.sumOpenInterest),
      sumOpenInterestValue: Number(p.sumOpenInterestValue),
    }));

    const first = series[0].sumOpenInterest;
    const last = series[series.length - 1].sumOpenInterest;
    const changePercent = first > 0 ? ((last - first) / first) * 100 : null;

    let trend: OpenInterestHistoryData["trend"] = "unknown";
    if (changePercent !== null) {
      if (changePercent > 2) trend = "expanding";
      else if (changePercent < -2) trend = "contracting";
      else trend = "flat";
    }

    return ok<OpenInterestHistoryData>(SOURCE, {
      symbol,
      series,
      trend,
      changePercent,
    });
  } catch (err) {
    const msg = err instanceof ToolHttpError ? err.message : String(err);
    return fail(SOURCE, msg);
  }
}

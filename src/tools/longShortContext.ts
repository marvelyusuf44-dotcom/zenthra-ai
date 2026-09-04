import { fetchJson, ToolHttpError } from "@/src/utils/httpClient";
import { ok, fail } from "@/src/utils/toolEnvelope";
import type { ToolEnvelope, LongShortContextData } from "@/src/types";

const SOURCE = "binance-futures";
const BASE_URL = "https://fapi.binance.com/futures/data/globalLongShortAccountRatio";

interface BinanceLSRRaw {
  symbol: string;
  longShortRatio: string;
  longAccount: string;
  shortAccount: string;
  timestamp: number;
}

/**
 * Tool: long_short_context(symbol)
 * Output: public global long/short account ratio (most recent point)
 * When called: deep investigation
 * Allowed inference: crowd positioning bias only — never treated as proof of direction
 * Failure fallback: omit
 */
export async function longShortContext(
  symbol: string
): Promise<ToolEnvelope<LongShortContextData>> {
  try {
    const raw = await fetchJson<BinanceLSRRaw[]>(
      `${BASE_URL}?symbol=${encodeURIComponent(symbol)}&period=1h&limit=1`,
      { timeoutMs: 5000, retries: 1 }
    );

    if (!Array.isArray(raw) || raw.length === 0) {
      return fail(SOURCE, `No long/short ratio data for ${symbol}`);
    }

    const latest = raw[raw.length - 1];

    return ok<LongShortContextData>(SOURCE, {
      symbol,
      longShortRatio: Number(latest.longShortRatio),
      longAccountPercent: Number(latest.longAccount) * 100,
      shortAccountPercent: Number(latest.shortAccount) * 100,
    });
  } catch (err) {
    const msg = err instanceof ToolHttpError ? err.message : String(err);
    return fail(SOURCE, msg);
  }
}

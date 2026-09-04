import { fetchJson, ToolHttpError } from "@/src/utils/httpClient";
import { ok, fail } from "@/src/utils/toolEnvelope";
import type { ToolEnvelope, OpenInterestData } from "@/src/types";

const SOURCE = "binance-futures";
const BASE_URL = "https://fapi.binance.com/fapi/v1/openInterest";

interface BinanceOIRaw {
  symbol: string;
  openInterest: string;
  time: number;
}

/**
 * Tool: open_interest(symbol)
 * Output: current open interest (contracts)
 * When called: candidate deep-dive
 * Allowed inference: positioning context
 * Failure fallback: reduce data quality (caller must not block the pipeline)
 */
export async function openInterest(
  symbol: string
): Promise<ToolEnvelope<OpenInterestData>> {
  try {
    const raw = await fetchJson<BinanceOIRaw>(
      `${BASE_URL}?symbol=${encodeURIComponent(symbol)}`,
      { timeoutMs: 5000, retries: 1 }
    );

    if (!raw || !raw.symbol) {
      return fail(SOURCE, `No open interest data for ${symbol}`);
    }

    return ok<OpenInterestData>(SOURCE, {
      symbol: raw.symbol,
      openInterest: Number(raw.openInterest),
    });
  } catch (err) {
    const msg = err instanceof ToolHttpError ? err.message : String(err);
    return fail(SOURCE, msg, { confidence: 0.3, reason: msg });
  }
}

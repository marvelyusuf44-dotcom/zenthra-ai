import { fetchJson, ToolHttpError } from "@/src/utils/httpClient";
import { ok, fail } from "@/src/utils/toolEnvelope";
import type { ToolEnvelope, FundingRateData } from "@/src/types";

const SOURCE = "binance-futures";
const BASE_URL = "https://fapi.binance.com/fapi/v1/premiumIndex";

interface BinancePremiumIndexRaw {
  symbol: string;
  lastFundingRate: string;
  nextFundingTime: number;
}

/**
 * Tool: funding_rate(symbol)
 * Output: last funding rate (decimal)
 * When called: deep investigation
 * Allowed inference: crowding/context (not price direction on its own)
 * Failure fallback: omit
 */
export async function fundingRate(
  symbol: string
): Promise<ToolEnvelope<FundingRateData>> {
  try {
    const raw = await fetchJson<BinancePremiumIndexRaw>(
      `${BASE_URL}?symbol=${encodeURIComponent(symbol)}`,
      { timeoutMs: 5000, retries: 1 }
    );

    if (!raw || !raw.symbol) {
      return fail(SOURCE, `No funding rate for ${symbol}`);
    }

    return ok<FundingRateData>(SOURCE, {
      symbol: raw.symbol,
      lastFundingRate: Number(raw.lastFundingRate),
      nextFundingTime: raw.nextFundingTime,
    });
  } catch (err) {
    const msg = err instanceof ToolHttpError ? err.message : String(err);
    return fail(SOURCE, msg);
  }
}

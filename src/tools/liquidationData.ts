import { notImplemented } from "@/src/utils/toolEnvelope";
import type { ToolEnvelope, LiquidationData } from "@/src/types";

const SOURCE = "unavailable-v1";

/**
 * Tool: liquidation_data(symbol, timeframe)
 * Output: aggregate liquidation data, if available
 * When called: deep investigation
 * Allowed inference: squeeze context
 * Failure fallback: omit
 *
 * V1 HONESTY NOTE: Binance's public futures API does not expose aggregate
 * market-wide liquidation history without authentication, and CoinGlass
 * (which does) is explicitly excluded from V1 as a paid dependency
 * (BLUEPRINT.md §9). Rather than approximate or fabricate this signal, V1
 * omits it entirely. The Liquidations component of the confluence score is
 * marked omitted and its weight is excluded from the achievable total —
 * see src/scoring/confluence.ts.
 */
export async function liquidationData(
  symbol: string,
  timeframe: string = "1h"
): Promise<ToolEnvelope<LiquidationData>> {
  return notImplemented(
    SOURCE,
    "No free public aggregate liquidation feed is available for V1 (CoinGlass is paid and explicitly excluded)."
  );
}

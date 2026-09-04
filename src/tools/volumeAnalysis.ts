import { ok, fail } from "@/src/utils/toolEnvelope";
import type { ToolEnvelope, Candle, VolumeAnalysisData } from "@/src/types";

const SOURCE = "derived-from-ohlcv";

/**
 * Tool: volume_analysis(symbol, candles)
 * Input: symbol, candle array already fetched via ohlcv()
 * Output: relative volume (current candle vs trailing average)
 * When called: candidate deep-dive, after ohlcv succeeds
 * Allowed inference: abnormal activity
 * Failure fallback: lower confidence
 *
 * This tool performs no network I/O — it is a deterministic transform over
 * data obtained from ohlcv(). It never invents volume figures.
 */
export function volumeAnalysis(
  symbol: string,
  candles: Candle[]
): ToolEnvelope<VolumeAnalysisData> {
  if (!candles || candles.length < 5) {
    return fail(SOURCE, `Insufficient candles to analyze volume for ${symbol}`);
  }

  const current = candles[candles.length - 1];
  const history = candles.slice(0, -1);
  const averageVolume =
    history.reduce((sum, c) => sum + c.volume, 0) / history.length;

  if (averageVolume <= 0) {
    return fail(SOURCE, `Average volume is zero for ${symbol}, cannot compute ratio`);
  }

  const relativeVolume = current.volume / averageVolume;

  return ok<VolumeAnalysisData>(
    SOURCE,
    {
      symbol,
      currentVolume: current.volume,
      averageVolume,
      relativeVolume,
    },
    { confidence: history.length >= 20 ? 0.9 : 0.6 }
  );
}

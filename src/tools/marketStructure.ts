import { ok, fail } from "@/src/utils/toolEnvelope";
import type { ToolEnvelope, Candle, MarketStructureData } from "@/src/types";

const SOURCE = "derived-from-ohlcv";

function ema(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const result: number[] = [];
  values.forEach((v, i) => {
    if (i === 0) {
      result.push(v);
    } else {
      result.push(v * k + result[i - 1] * (1 - k));
    }
  });
  return result;
}

function averageTrueRange(candles: Candle[], period: number): number | null {
  if (candles.length < period + 1) return null;
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const cur = candles[i];
    const prev = candles[i - 1];
    const tr = Math.max(
      cur.high - cur.low,
      Math.abs(cur.high - prev.close),
      Math.abs(cur.low - prev.close)
    );
    trs.push(tr);
  }
  const recent = trs.slice(-period);
  return recent.reduce((s, v) => s + v, 0) / recent.length;
}

/**
 * Tool: market_structure(symbol, candles, timeframe)
 * Input: symbol, candle array from ohlcv(), timeframe label
 * Output: trend classification, swing high/low, ATR, volatility%, EMA fast/slow
 * When called: deep investigation
 * Allowed inference: structure/risk (this is the primary input to the risk engine)
 * Failure fallback: no setup if unreliable (returned via ok:false)
 *
 * Purely deterministic — no LLM involvement, no network I/O. This is the
 * function the risk engine leans on for entry/invalidation/TP levels, so it
 * must never guess: insufficient data returns ok:false rather than a shaky
 * structure.
 */
export function marketStructure(
  symbol: string,
  candles: Candle[],
  timeframe: string
): ToolEnvelope<MarketStructureData> {
  const MIN_CANDLES = 30;
  if (!candles || candles.length < MIN_CANDLES) {
    return fail(
      SOURCE,
      `Insufficient candles (${candles?.length ?? 0}/${MIN_CANDLES}) to compute reliable market structure for ${symbol}`
    );
  }

  const closes = candles.map((c) => c.close);
  const emaFastSeries = ema(closes, 20);
  const emaSlowSeries = ema(closes, 50 > closes.length ? Math.max(10, Math.floor(closes.length / 2)) : 50);

  const emaFast = emaFastSeries[emaFastSeries.length - 1];
  const emaSlow = emaSlowSeries[emaSlowSeries.length - 1];

  const lookback = candles.slice(-30);
  const swingHigh = Math.max(...lookback.map((c) => c.high));
  const swingLow = Math.min(...lookback.map((c) => c.low));

  const atr = averageTrueRange(candles, 14);
  const lastClose = closes[closes.length - 1];
  const volatilityPercent = atr !== null && lastClose > 0 ? (atr / lastClose) * 100 : null;

  let trend: MarketStructureData["trend"] = "unknown";
  const emaSpreadPercent = ((emaFast - emaSlow) / emaSlow) * 100;
  if (Math.abs(emaSpreadPercent) < 0.15) {
    trend = "range";
  } else if (emaFast > emaSlow && lastClose > emaFast) {
    trend = "uptrend";
  } else if (emaFast < emaSlow && lastClose < emaFast) {
    trend = "downtrend";
  } else {
    trend = "range";
  }

  return ok<MarketStructureData>(
    SOURCE,
    {
      symbol,
      timeframe,
      trend,
      swingHigh,
      swingLow,
      atr,
      volatilityPercent,
      emaFast,
      emaSlow,
    },
    { confidence: candles.length >= 100 ? 0.9 : 0.65 }
  );
}

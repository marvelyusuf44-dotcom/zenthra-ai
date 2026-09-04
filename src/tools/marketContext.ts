import { fetchJson, ToolHttpError } from "@/src/utils/httpClient";
import { ok, fail } from "@/src/utils/toolEnvelope";
import { COINGECKO_ID_BY_SYMBOL } from "@/src/tools/coingeckoIds";
import type { ToolEnvelope, MarketContextData } from "@/src/types";

const SOURCE = "coingecko";
const BASE_URL = "https://api.coingecko.com/api/v3";

interface CoinGeckoMarketRaw {
  id: string;
  market_cap_rank: number | null;
  price_change_percentage_24h: number | null;
  price_change_percentage_7d_in_currency?: number | null;
}

interface CoinGeckoTrendingRaw {
  coins: { item: { id: string } }[];
}

/**
 * Tool: market_context(symbol, timeframe)
 * Output: verified public context — market-cap rank, 24h/7d change, whether
 * the asset is currently CoinGecko "trending".
 *
 * HONESTY NOTE: this is NOT a news/causal-explanation engine. CoinGecko's
 * free tier does not provide article-level news synthesis, and V1 has no
 * mandatory paid news API (BLUEPRINT.md §9). When the AI layer explains an
 * "abnormal movement", it must present this as public market context, not
 * as a verified causal reason for the move, and must explicitly say when no
 * qualitative explanation is available.
 * Failure fallback: state unavailable.
 */
export async function marketContext(
  symbol: string
): Promise<ToolEnvelope<MarketContextData>> {
  const geckoId = COINGECKO_ID_BY_SYMBOL[symbol];
  if (!geckoId) {
    return fail(SOURCE, `No CoinGecko mapping for symbol ${symbol}`);
  }

  try {
    const [marketsRaw, trendingRaw] = await Promise.all([
      fetchJson<CoinGeckoMarketRaw[]>(
        `${BASE_URL}/coins/markets?vs_currency=usd&ids=${geckoId}&price_change_percentage=7d`,
        { timeoutMs: 6000, retries: 1 }
      ),
      fetchJson<CoinGeckoTrendingRaw>(`${BASE_URL}/search/trending`, {
        timeoutMs: 6000,
        retries: 1,
      }).catch(() => null),
    ]);

    if (!Array.isArray(marketsRaw) || marketsRaw.length === 0) {
      return fail(SOURCE, `No CoinGecko market data for ${symbol}`);
    }

    const m = marketsRaw[0];
    const isTrending =
      trendingRaw?.coins?.some((c) => c.item.id === geckoId) ?? false;

    const parts: string[] = [];
    if (m.market_cap_rank) parts.push(`market cap rank #${m.market_cap_rank}`);
    if (m.price_change_percentage_24h !== null)
      parts.push(`24h change ${m.price_change_percentage_24h.toFixed(2)}%`);
    if (m.price_change_percentage_7d_in_currency != null)
      parts.push(`7d change ${m.price_change_percentage_7d_in_currency.toFixed(2)}%`);
    if (isTrending) parts.push("currently trending on CoinGecko");

    const summary = parts.length > 0 ? parts.join(", ") : null;

    return ok<MarketContextData>(SOURCE, {
      symbol,
      summary,
      sourceUrls: [`https://www.coingecko.com/en/coins/${geckoId}`],
    });
  } catch (err) {
    const msg = err instanceof ToolHttpError ? err.message : String(err);
    return fail(SOURCE, msg);
  }
}

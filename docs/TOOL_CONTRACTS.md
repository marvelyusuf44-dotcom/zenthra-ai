# TOOL/DATA CONTRACTS

Every external tool must return normalized data plus source metadata.

| Tool | Input | Output | When | Allowed inference | Failure fallback |
|---|---|---|---|---|---|
| market_ticker | symbol | price, change, volume | scan | momentum/activity | skip symbol |
| ohlcv | symbol, timeframe, limit | candles | candidate | trend/structure inputs | retry/alternate timeframe |
| volume_analysis | symbol, candles | relative volume | candidate | abnormal activity | lower confidence |
| open_interest | symbol | OI | candidate | positioning context | reduce data quality |
| open_interest_history | symbol, timeframe | OI series | deep investigation | expansion/contraction | current OI |
| funding_rate | symbol | funding | deep investigation | crowding/context | omit |
| liquidation_data | symbol, timeframe | liquidation data | deep investigation | squeeze context | omit |
| long_short_context | symbol | public positioning context | deep investigation | bias only | omit |
| market_structure | symbol, candles, timeframe | trend, levels, volatility | deep investigation | structure/risk | no setup if unreliable |
| onchain_activity | asset, chain | activity metrics | candidate | supporting evidence | omit |
| wallet_discovery | asset, criteria | wallet/entity candidates | candidate | discovery candidates | omit |
| wallet_behavior | wallet, asset, timeframe | behavior/activity | wallet candidate | historical behavior | omit |
| entity_lookup | address | supported label/entity | attribution | attribution only | show address |
| market_context | symbol, timeframe | verified context/news | abnormal move/explanation | context | state unavailable |

Universal response:
```
{
  "ok": true,
  "source": "provider",
  "timestamp": "ISO-8601",
  "data": {},
  "dataQuality": {}
}
```

Failure must be explicit. Never fabricate.

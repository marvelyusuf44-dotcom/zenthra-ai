import { notImplemented } from "@/src/utils/toolEnvelope";
import type { ToolEnvelope, WalletBehaviorData } from "@/src/types";

const SOURCE = "unavailable-v1";

/**
 * Tool: wallet_behavior(wallet, asset, timeframe)
 * Output: historical behavior/activity for a specific wallet
 * When called: after a wallet candidate is surfaced (see wallet_discovery)
 * Allowed inference: historical behavior only
 * Failure fallback: omit
 *
 * V1 HONESTY NOTE: depends on wallet_discovery surfacing a real candidate
 * first, which V1 does not implement (see wallet_discovery.ts). Kept as a
 * typed stub so the tool contract and future implementation slot are clear.
 */
export async function walletBehavior(
  wallet: string,
  asset: string,
  timeframe: string
): Promise<ToolEnvelope<WalletBehaviorData>> {
  return notImplemented(
    SOURCE,
    "Wallet behavior analysis is not available in V1 (depends on wallet_discovery, which is not implemented)."
  );
}

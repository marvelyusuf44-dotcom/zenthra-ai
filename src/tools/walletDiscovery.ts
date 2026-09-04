import { notImplemented } from "@/src/utils/toolEnvelope";
import type { ToolEnvelope, WalletDiscoveryData } from "@/src/types";

const SOURCE = "unavailable-v1";

/**
 * Tool: wallet_discovery(asset, criteria)
 * Output: candidate wallets/entities matching criteria (e.g. "accumulating SOL")
 * When called: discovery flows ("who is accumulating X")
 * Allowed inference: candidates only, never guaranteed intent
 * Failure fallback: omit
 *
 * V1 HONESTY NOTE: discovering *which* wallets are accumulating a given
 * asset requires a labeled-wallet index built from historical on-chain
 * data (an indexer/analytics product). No free public API provides this
 * for the V1 universe. Implementing a fake "discovery" using synthesized
 * addresses would violate the no-fabrication rule directly, so this tool
 * is intentionally left unimplemented in V1. Discovery-oriented questions
 * ("who is accumulating SOL?") should be answered by the AI layer as
 * "not available in V1" rather than guessed at.
 */
export async function walletDiscovery(
  asset: string,
  criteria: string
): Promise<ToolEnvelope<WalletDiscoveryData>> {
  return notImplemented(
    SOURCE,
    "Wallet/entity discovery requires a labeled on-chain index not available for free in V1."
  );
}

import { notImplemented } from "@/src/utils/toolEnvelope";
import type { ToolEnvelope, OnchainActivityData } from "@/src/types";

const SOURCE = "unavailable-v1";

/**
 * Tool: onchain_activity(asset, chain)
 * Output: public on-chain activity metrics
 * When called: candidate deep-dive
 * Allowed inference: supporting evidence only
 * Failure fallback: omit
 *
 * V1 HONESTY NOTE: reliable free "activity" metrics (net exchange flow,
 * whale accumulation, holder concentration) require an indexer service
 * (Nansen/Arkham/Glassnode-class product) — these are paid and explicitly
 * excluded as a mandatory V1 dependency (BLUEPRINT.md §9). Public chain RPC
 * endpoints alone (e.g. raw Solana/Ethereum JSON-RPC) expose block/tx
 * primitives, not the aggregated "who is accumulating" signal the product
 * promises — building that from raw RPC calls per request is not reliable
 * or honest to ship as V1. Rather than approximate this with a shallow
 * proxy metric that looks like on-chain intelligence but isn't, V1 omits
 * this tool. The On-chain component of the confluence score is marked
 * omitted — see src/scoring/confluence.ts. This is documented as a known
 * V1 limitation, not silently dropped.
 */
export async function onchainActivity(
  asset: string,
  chain: string
): Promise<ToolEnvelope<OnchainActivityData>> {
  void asset;
  void chain;
  return notImplemented(
    SOURCE,
    "No free, reliable aggregated on-chain activity source is wired for V1. Requires an indexer (e.g. paid) in a future version."
  );
}

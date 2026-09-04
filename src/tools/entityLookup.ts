import { notImplemented } from "@/src/utils/toolEnvelope";
import type { ToolEnvelope, EntityLookupData } from "@/src/types";

const SOURCE = "unavailable-v1";

/**
 * Tool: entity_lookup(address)
 * Output: supported label/entity for an address, if any
 * When called: attribution step after a wallet is surfaced
 * Allowed inference: attribution only — never invent a label
 * Failure fallback: show the raw address instead of a label
 *
 * V1 HONESTY NOTE: entity labeling (exchange/fund/known-whale attribution)
 * requires a maintained label database (paid in practice). V1 has none, so
 * this always returns label: null — callers must display the raw address,
 * never a fabricated name.
 */
export async function entityLookup(
  address: string
): Promise<ToolEnvelope<EntityLookupData>> {
  return notImplemented(
    SOURCE,
    "No entity/label database is available in V1. Always show the raw address."
  );
}

import type { EvidenceItem, ToolEnvelope } from "@/src/types";

/**
 * Normalizes a tool's envelope into a compact, renderable EvidenceItem.
 * Used to build the `evidence` array attached to every candidate result so
 * the frontend/AI layer can show exactly what was checked and what wasn't —
 * never silently.
 */
export function toEvidenceItem<T>(
  tool: string,
  env: ToolEnvelope<T>,
  summarize: (data: T) => string
): EvidenceItem {
  if (!env.ok || !env.data) {
    return {
      tool,
      ok: false,
      source: env.source,
      summary: env.error ?? "unavailable",
      omitted: env.dataQuality?.omitted ?? true,
    };
  }
  return {
    tool,
    ok: true,
    source: env.source,
    summary: summarize(env.data),
    omitted: false,
  };
}

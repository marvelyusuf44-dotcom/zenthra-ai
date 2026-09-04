import type { ToolEnvelope, DataQualityNote } from "@/src/types";

export function ok<T>(
  source: string,
  data: T,
  dataQuality?: DataQualityNote
): ToolEnvelope<T> {
  return {
    ok: true,
    source,
    timestamp: new Date().toISOString(),
    data,
    dataQuality,
  };
}

export function fail<T>(
  source: string,
  error: string,
  dataQuality?: DataQualityNote
): ToolEnvelope<T> {
  return {
    ok: false,
    source,
    timestamp: new Date().toISOString(),
    data: null,
    error,
    dataQuality: dataQuality ?? { confidence: 0, reason: error, omitted: true },
  };
}

/** V1 has no reliable free data source for this tool. This is an honest,
 *  explicit "not implemented" — never a fabricated result. */
export function notImplemented<T>(source: string, reason: string): ToolEnvelope<T> {
  return {
    ok: false,
    source,
    timestamp: new Date().toISOString(),
    data: null,
    error: `Not available in V1: ${reason}`,
    dataQuality: { confidence: 0, reason, omitted: true },
  };
}

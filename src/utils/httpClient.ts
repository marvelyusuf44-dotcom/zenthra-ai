// Bounded-timeout, bounded-retry fetch wrapper.
// Every external data source in src/tools MUST go through this — no raw fetch calls
// scattered around the codebase — so timeout/retry/error handling is consistent
// and auditable in one place (per BLUEPRINT.md and TOOL_CONTRACTS.md).

export interface FetchJsonOptions {
  timeoutMs?: number;
  retries?: number; // additional attempts after the first
  retryDelayMs?: number;
  headers?: Record<string, string>;
}

export class ToolHttpError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "ToolHttpError";
  }
}

const DEFAULT_TIMEOUT_MS = 6000;
const DEFAULT_RETRIES = 1;
const DEFAULT_RETRY_DELAY_MS = 400;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch JSON with a bounded timeout and bounded retries.
 * Throws ToolHttpError on failure — callers (tools) are responsible for
 * catching this and returning an honest ok:false ToolEnvelope. This function
 * never fabricates or returns partial/synthetic data.
 */
export async function fetchJson<T>(
  url: string,
  options: FetchJsonOptions = {}
): Promise<T> {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    retries = DEFAULT_RETRIES,
    retryDelayMs = DEFAULT_RETRY_DELAY_MS,
    headers = {},
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          ...headers,
        },
        // Never cache market/derivatives data — it is time-sensitive.
        cache: "no-store",
      });

      clearTimeout(timer);

      if (!res.ok) {
        // 429 / 5xx are retryable; 4xx (client errors) are not.
        const retryable = res.status === 429 || res.status >= 500;
        if (retryable && attempt < retries) {
          lastError = new ToolHttpError(
            `HTTP ${res.status} from ${url}`,
            res.status
          );
          await sleep(retryDelayMs * (attempt + 1));
          continue;
        }
        throw new ToolHttpError(
          `HTTP ${res.status} from ${url}`,
          res.status
        );
      }

      return (await res.json()) as T;
    } catch (err) {
      clearTimeout(timer);
      lastError = err;

      const isAbort =
        err instanceof Error && err.name === "AbortError";
      if (attempt < retries) {
        await sleep(retryDelayMs * (attempt + 1));
        continue;
      }
      if (isAbort) {
        throw new ToolHttpError(`Timeout after ${timeoutMs}ms fetching ${url}`, undefined, err);
      }
      throw new ToolHttpError(
        `Failed to fetch ${url}: ${err instanceof Error ? err.message : String(err)}`,
        undefined,
        err
      );
    }
  }

  throw new ToolHttpError(
    `Failed to fetch ${url} after ${retries + 1} attempts`,
    undefined,
    lastError
  );
}

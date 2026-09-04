import type { AIProvider, AIProviderResponse, ChatTurn } from "@/src/agent/aiProvider";
import { logger } from "@/src/utils/logger";

/**
 * Google Gemini Developer API adapter (AI_API_CONTRACT.md).
 * Model/provider are read from environment configuration — never hard-coded
 * as business logic beyond this file's default.
 */

interface GeminiContent {
  role: "user" | "model";
  parts: { text: string }[];
}

interface GeminiGenerateResponse {
  candidates?: {
    content?: { parts?: { text?: string }[] };
    finishReason?: string;
  }[];
  promptFeedback?: { blockReason?: string };
  error?: { code: number; message: string; status: string };
}

const DEFAULT_MODEL = "gemini-2.5-flash";
const TIMEOUT_MS = 20000;

export class GeminiProvider implements AIProvider {
  readonly name = "google";
  readonly model: string;
  private readonly apiKey: string | undefined;

  constructor() {
    this.model = process.env.AI_MODEL || DEFAULT_MODEL;
    this.apiKey = process.env.GEMINI_API_KEY;
  }

  async generate(
    systemPrompt: string,
    history: ChatTurn[],
    userMessage: string
  ): Promise<AIProviderResponse> {
    if (!this.apiKey) {
      return {
        ok: false,
        text: null,
        unavailable: true,
        error: "GEMINI_API_KEY is not configured on the server.",
      };
    }

    const contents: GeminiContent[] = [
      ...history.map((h) => ({
        role: h.role === "user" ? ("user" as const) : ("model" as const),
        parts: [{ text: h.content }],
      })),
      { role: "user", parts: [{ text: userMessage }] },
    ];

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      this.model
    )}:generateContent?key=${this.apiKey}`;

    // src/utils/httpClient.fetchJson is a GET-only convenience wrapper, so
    // this POST call is made directly here with the same timeout/abort
    // discipline (bounded timeout, no caching, explicit error mapping).
    return this.postGenerate(url, systemPrompt, contents);
  }

  private async postGenerate(
    url: string,
    systemPrompt: string,
    contents: GeminiContent[]
  ): Promise<AIProviderResponse> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1024,
          },
        }),
      });
      clearTimeout(timer);

      const json = (await res.json()) as GeminiGenerateResponse;

      if (!res.ok) {
        const isQuota = res.status === 429;
        logger.warn("gemini.error", { status: res.status, body: json?.error });
        return {
          ok: false,
          text: null,
          error: json?.error?.message || `Gemini HTTP ${res.status}`,
          unavailable: isQuota,
        };
      }

      return this.parse(json);
    } catch (err) {
      clearTimeout(timer);
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn("gemini.request_failed", { error: msg });
      return { ok: false, text: null, error: msg };
    }
  }

  private parse(json: GeminiGenerateResponse): AIProviderResponse {
    if (json.promptFeedback?.blockReason) {
      return {
        ok: false,
        text: null,
        error: `Blocked: ${json.promptFeedback.blockReason}`,
      };
    }
    const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? null;
    if (!text) {
      return { ok: false, text: null, error: "Empty response from Gemini" };
    }
    return { ok: true, text };
  }
}

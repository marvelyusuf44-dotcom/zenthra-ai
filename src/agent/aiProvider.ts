/**
 * AI provider abstraction (AI_API_CONTRACT.md "Model abstraction").
 * The intelligence engine (agent/orchestrator.ts, scoring/, risk/) never
 * imports a concrete provider — only this interface. Swapping providers
 * means writing a new adapter that implements AIProvider, nothing else.
 */

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface AIProviderResponse {
  ok: boolean;
  text: string | null;
  error?: string;
  /** True if the failure was a missing/invalid API key, so callers can
   *  distinguish "AI unavailable" from "AI errored". */
  unavailable?: boolean;
}

export interface AIProvider {
  readonly name: string;
  readonly model: string;
  generate(systemPrompt: string, history: ChatTurn[], userMessage: string): Promise<AIProviderResponse>;
}

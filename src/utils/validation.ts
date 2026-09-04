import { z } from "zod";
import { V1_UNIVERSE } from "@/src/types";

export const FuturesScanRequestSchema = z.object({
  query: z.string().trim().min(1).max(500).optional().default(
    "Find interesting futures opportunities right now"
  ),
  // Optional explicit symbol filter. If omitted, the full V1 universe is scanned.
  symbols: z
    .array(z.enum(V1_UNIVERSE))
    .max(V1_UNIVERSE.length)
    .optional(),
});

export type FuturesScanRequest = z.infer<typeof FuturesScanRequestSchema>;

export const ChatRequestSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  // Client-held conversation history, sent back each turn (server is stateless).
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(4000),
      })
    )
    .max(20)
    .optional()
    .default([]),
});

export type ChatRequest = z.infer<typeof ChatRequestSchema>;

/**
 * Schema the AI's structured "research plan / intent" output must satisfy
 * before the backend will act on it. Anything that fails validation is
 * discarded — the deterministic pipeline runs regardless.
 */
export const IntentSchema = z.object({
  intent: z.enum(["futures_scan", "general_question", "unsupported"]),
  symbols: z.array(z.string()).max(10).optional().default([]),
  reasoning: z.string().max(500).optional(),
});

export type Intent = z.infer<typeof IntentSchema>;

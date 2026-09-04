"use client";

import { useState } from "react";
import type { CandidateResult, FuturesScanResult } from "@/src/types";

const SIDEBAR_TOOLS = [
  { name: "AI Research", available: true },
  { name: "Futures", available: true },
  { name: "Discover", available: false },
  { name: "Markets", available: false },
  { name: "Smart Money", available: false },
  { name: "Wallets", available: false },
  { name: "Entities", available: false },
  { name: "Signals", available: false },
  { name: "News", available: false },
  { name: "Monitor", available: false },
];

const SUGGESTED_PROMPTS = [
  "Are there interesting futures setups right now?",
  "Why is ETH moving?",
  "Find unusual activity today.",
  "What's the setup on SOL?",
];

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  scan?: FuturesScanResult;
  degraded?: boolean;
}

type ProgressStep = "idle" | "sending" | "scanning" | "explaining" | "done" | "error";

export default function Workspace() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [progress, setProgress] = useState<ProgressStep>("idle");
  const [errorText, setErrorText] = useState<string | null>(null);

  async function send(text: string) {
    const message = text.trim();
    if (!message || progress === "sending" || progress === "scanning") return;

    setErrorText(null);
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: message }];
    setMessages(nextMessages);
    setInput("");
    setProgress("sending");

    try {
      setProgress("scanning");
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          history: nextMessages.slice(0, -1).map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      setProgress("explaining");
      const data = await res.json();

      if (!data.ok) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              data.reply ||
              `AI explanation is unavailable right now (${data.error ?? "unknown error"}). ${
                data.scan
                  ? "The deterministic scan result below is still real and unaffected."
                  : ""
              }`,
            scan: data.scan,
            degraded: true,
          },
        ]);
        setErrorText(data.error ?? "AI provider unavailable");
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.reply, scan: data.scan },
        ]);
      }
      setProgress("done");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorText(msg);
      setProgress("error");
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Request failed: ${msg}`, degraded: true },
      ]);
    } finally {
      setProgress("idle");
    }
  }

  return (
    <div className="flex h-screen bg-zenthra-black text-zenthra-white">
      {/* Sidebar */}
      <aside className="hidden w-56 shrink-0 border-r border-zenthra-border bg-zenthra-surface md:block">
        <div className="px-4 py-5 text-lg font-semibold">Zenthra</div>
        <nav className="mt-2 space-y-1 px-2">
          {SIDEBAR_TOOLS.map((tool) => (
            <div
              key={tool.name}
              className={`flex items-center justify-between rounded-md px-3 py-2 text-sm ${
                tool.available
                  ? "bg-zenthra-blue-soft text-zenthra-blue-bright"
                  : "text-zenthra-muted"
              }`}
            >
              <span>{tool.name}</span>
              {!tool.available && (
                <span className="text-[10px] uppercase tracking-wide text-zenthra-muted">
                  soon
                </span>
              )}
            </div>
          ))}
        </nav>
      </aside>

      {/* Main chat column */}
      <div className="flex flex-1 flex-col">
        <div className="flex-1 overflow-y-auto zenthra-scroll px-4 py-8 md:px-10">
          <div className="mx-auto max-w-3xl">
            {messages.length === 0 ? (
              <EmptyState onPick={send} />
            ) : (
              <div className="space-y-6">
                {messages.map((m, i) => (
                  <MessageBubble key={i} message={m} />
                ))}
              </div>
            )}

            {(progress === "sending" || progress === "scanning" || progress === "explaining") && (
              <ProgressIndicator step={progress} />
            )}

            {errorText && progress !== "sending" && (
              <p className="mt-4 rounded-md border border-red-900/50 bg-red-950/30 px-4 py-2 text-xs text-red-300">
                {errorText}
              </p>
            )}
          </div>
        </div>

        {/* Composer */}
        <div className="border-t border-zenthra-border bg-zenthra-surface/70 px-4 py-4 md:px-10">
          <form
            className="mx-auto flex max-w-3xl gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="What would you like to investigate?"
              className="flex-1 rounded-md border border-zenthra-border bg-zenthra-black px-4 py-3 text-sm outline-none focus:border-zenthra-blue"
            />
            <button
              type="submit"
              disabled={progress !== "idle" && progress !== "error" && progress !== "done"}
              className="rounded-md bg-zenthra-blue px-5 py-3 text-sm font-medium text-white hover:bg-zenthra-blue-bright disabled:opacity-50"
            >
              Ask
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="mt-20 text-center">
      <h1 className="text-2xl font-semibold">What would you like to investigate?</h1>
      <div className="mt-8 grid gap-3 md:grid-cols-2">
        {SUGGESTED_PROMPTS.map((p) => (
          <button
            key={p}
            onClick={() => onPick(p)}
            className="rounded-md border border-zenthra-border bg-zenthra-surface px-4 py-3 text-left text-sm text-zenthra-muted hover:border-zenthra-blue hover:text-zenthra-white"
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}

function ProgressIndicator({ step }: { step: ProgressStep }) {
  const label =
    step === "sending"
      ? "Sending question..."
      : step === "scanning"
      ? "Running deterministic futures scan (real market data)..."
      : "Generating explanation from Gemini...";
  return (
    <div className="mt-4 flex items-center gap-2 text-xs text-zenthra-muted">
      <span className="h-2 w-2 animate-pulse rounded-full bg-zenthra-blue-bright" />
      {label}
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={isUser ? "flex justify-end" : "flex justify-start"}>
      <div
        className={`max-w-[85%] rounded-lg px-4 py-3 text-sm ${
          isUser
            ? "bg-zenthra-blue text-white"
            : "border border-zenthra-border bg-zenthra-surface text-zenthra-white"
        }`}
      >
        {message.degraded && !isUser && (
          <p className="mb-2 text-[11px] uppercase tracking-wide text-amber-400">
            Degraded — AI explanation unavailable
          </p>
        )}
        <p className="whitespace-pre-wrap">{message.content}</p>
        {message.scan && <ScanResultCard scan={message.scan} />}
      </div>
    </div>
  );
}

function ScanResultCard({ scan }: { scan: FuturesScanResult }) {
  if (scan.candidates.length === 0) {
    return (
      <div className="mt-3 rounded-md border border-zenthra-border bg-zenthra-black/40 p-3 text-xs text-zenthra-muted">
        No candidates could be scanned ({scan.dataQuality.symbolsFailed} failed).
        {scan.dataQuality.notes.map((n) => (
          <p key={n}>{n}</p>
        ))}
      </div>
    );
  }
  return (
    <div className="mt-3 space-y-2">
      {scan.candidates.slice(0, 5).map((c) => (
        <CandidateRow key={c.symbol} candidate={c} />
      ))}
    </div>
  );
}

function CandidateRow({ candidate }: { candidate: CandidateResult }) {
  const [open, setOpen] = useState(false);
  const badgeColor =
    candidate.classification === "STRONG_SETUP"
      ? "bg-emerald-500/20 text-emerald-400"
      : candidate.classification === "VALID_SETUP"
      ? "bg-zenthra-blue-soft text-zenthra-blue-bright"
      : candidate.classification === "WATCH"
      ? "bg-amber-500/20 text-amber-400"
      : "bg-zenthra-border text-zenthra-muted";

  return (
    <div className="rounded-md border border-zenthra-border bg-zenthra-black/40 p-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left"
      >
        <div>
          <span className="font-mono text-sm">{candidate.symbol}</span>
          <span className="ml-2 text-xs text-zenthra-muted">{candidate.direction}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded px-2 py-0.5 text-[10px] font-medium ${badgeColor}`}>
            {candidate.classification.replace("_", " ")}
          </span>
          <span className="font-mono text-xs">{candidate.totalScore}/100</span>
        </div>
      </button>

      {open && (
        <div className="mt-3 space-y-3 border-t border-zenthra-border pt-3 text-xs">
          <div>
            <p className="mb-1 font-medium text-zenthra-muted">Component scores</p>
            <div className="space-y-1">
              {candidate.components.map((c) => (
                <div key={c.key} className="flex justify-between">
                  <span className={c.omitted ? "text-zenthra-muted line-through" : ""}>
                    {c.label} ({c.weight}pt)
                  </span>
                  <span>{c.omitted ? "omitted" : `${c.score.toFixed(1)}`}</span>
                </div>
              ))}
            </div>
          </div>

          {candidate.conflicts.length > 0 && (
            <div>
              <p className="mb-1 font-medium text-amber-400">Conflicts detected</p>
              {candidate.conflicts.map((cf) => (
                <p key={cf.code} className="text-zenthra-muted">
                  • {cf.description}
                </p>
              ))}
            </div>
          )}

          {candidate.risk && (
            <div>
              <p className="mb-1 font-medium text-zenthra-muted">Risk (derived from structure)</p>
              <p className="text-zenthra-muted">
                Entry {candidate.risk.entryZoneLow}–{candidate.risk.entryZoneHigh} · Invalidation{" "}
                {candidate.risk.invalidation} · TP1 {candidate.risk.tp1} · TP2 {candidate.risk.tp2}
              </p>
              <p className="text-zenthra-muted">{candidate.risk.derivedFrom}</p>
            </div>
          )}

          <div>
            <p className="mb-1 font-medium text-zenthra-muted">Evidence</p>
            {candidate.evidence.map((e) => (
              <p key={e.tool} className={e.ok ? "text-zenthra-muted" : "text-zenthra-muted/60"}>
                • {e.tool}: {e.summary} {!e.ok && "(unavailable)"}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

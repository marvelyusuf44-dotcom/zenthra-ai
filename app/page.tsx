import Link from "next/link";

const CAPABILITIES = [
  {
    number: "01",
    title: "Futures intelligence",
    body: "A deterministic confluence engine reads structure, momentum, open interest, funding and context before it classifies a setup.",
    tag: "REAL-TIME MARKET DATA",
  },
  {
    number: "02",
    title: "Discovery, not lookup",
    body: "Start with a question or a behavior. Zenthra turns a broad intent into a focused research path instead of making you collect addresses first.",
    tag: "RESEARCH ORCHESTRATION",
  },
  {
    number: "03",
    title: "Evidence you can inspect",
    body: "Scores, conflicts and risk levels remain traceable to the data that produced them. When evidence is missing, Zenthra says so.",
    tag: "EXPLAINABLE OUTPUTS",
  },
];

const WORKFLOW_STEPS = [
  ["01", "Question", "Start with what you want to know."],
  ["02", "Research plan", "The agent selects the relevant evidence."],
  ["03", "Cross-check", "Signals are compared, not blindly stacked."],
  ["04", "Decision", "Get a classified result with derived risk."],
];

const DATA_POINTS = [
  "Market structure",
  "Momentum & volume",
  "Open interest",
  "Funding rate",
  "Market context",
];

const TOOLS = ["AI Research", "Futures", "Discover", "Markets", "Smart Money"];

export default function LandingPage() {
  return (
    <main className="overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[720px]">
        <div className="zenthra-grid absolute inset-0 opacity-70" />
        <div className="absolute left-1/2 top-[-280px] h-[560px] w-[720px] -translate-x-1/2 rounded-full bg-zenthra-blue/10 blur-[130px]" />
      </div>

      <header className="sticky top-0 z-40 border-b border-zenthra-border/80 bg-zenthra-black/85 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="flex items-center gap-3" aria-label="Zenthra home">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zenthra-blue text-sm font-bold text-white shadow-lg shadow-zenthra-blue/25">
              Z
            </span>
            <span className="text-base font-semibold tracking-tight">Zenthra</span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm text-zenthra-muted lg:flex" aria-label="Primary navigation">
            <a href="#capabilities" className="transition hover:text-zenthra-white">Capabilities</a>
            <a href="#method" className="transition hover:text-zenthra-white">Method</a>
            <a href="#pricing" className="transition hover:text-zenthra-white">Access</a>
            <a href="#about" className="transition hover:text-zenthra-white">About</a>
          </nav>
          <Link
            href="/ai"
            className="rounded-lg bg-zenthra-blue px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zenthra-blue-bright focus:outline-none focus:ring-2 focus:ring-zenthra-blue-bright focus:ring-offset-2 focus:ring-offset-zenthra-black"
          >
            Open workspace
          </Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl items-center gap-14 px-5 pb-24 pt-20 sm:px-8 md:pb-32 md:pt-28 lg:grid-cols-[1.02fr_0.98fr] lg:gap-20">
        <div>
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-zenthra-blue/30 bg-zenthra-blue/10 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.16em] text-zenthra-blue-bright">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]" />
            AI agent for on-chain intelligence
          </div>
          <h1 className="max-w-3xl text-5xl font-semibold leading-[1.05] tracking-[-0.04em] text-zenthra-white sm:text-6xl lg:text-7xl">
            Research the signal.
            <span className="block text-zenthra-blue-bright">Not the noise.</span>
          </h1>
          <p className="mt-7 max-w-xl text-base leading-7 text-zenthra-muted sm:text-lg">
            Ask a question about the on-chain world. Zenthra plans the research,
            checks the evidence, and explains what the data can — and cannot —
            support.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/ai"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-zenthra-blue px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-zenthra-blue-bright"
            >
              Start an investigation
              <span aria-hidden="true">↗</span>
            </Link>
            <a
              href="#method"
              className="inline-flex items-center justify-center rounded-lg border border-zenthra-border px-5 py-3.5 text-sm font-medium text-zenthra-white transition hover:border-zenthra-muted"
            >
              How it works
            </a>
          </div>
          <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-xs text-zenthra-muted">
            <span className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Evidence-first</span>
            <span className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Deterministic scoring</span>
            <span className="flex items-center gap-2"><span className="text-emerald-400">✓</span> No guaranteed outcomes</span>
          </div>
        </div>

        <div className="zenthra-glow relative mx-auto w-full max-w-[560px]">
          <div className="zenthra-panel relative overflow-hidden rounded-2xl border border-zenthra-border p-4 shadow-2xl sm:p-5">
            <div className="absolute right-[-80px] top-[-100px] h-56 w-56 rounded-full bg-zenthra-blue/15 blur-3xl" />
            <div className="relative flex items-center justify-between border-b border-zenthra-border pb-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-zenthra-blue/20 text-xs font-bold text-zenthra-blue-bright">Z</span>
                <span className="text-sm font-medium">Research workspace</span>
              </div>
              <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Live
              </span>
            </div>
            <div className="relative grid gap-4 py-5 sm:grid-cols-[0.75fr_1.25fr]">
              <div className="space-y-1.5 border-b border-zenthra-border pb-4 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-4">
                <p className="mb-3 text-[10px] uppercase tracking-[0.16em] text-zenthra-muted">Research tools</p>
                {TOOLS.map((tool, index) => (
                  <div key={tool} className={`flex items-center justify-between rounded-md px-2.5 py-2 text-xs ${index === 1 ? "bg-zenthra-blue/15 text-zenthra-blue-bright" : "text-zenthra-muted"}`}>
                    <span>{tool}</span>
                    {index > 1 && <span className="text-[9px] uppercase tracking-wider text-zenthra-muted/70">soon</span>}
                  </div>
                ))}
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-zenthra-muted">Current investigation</p>
                <p className="mt-3 text-sm leading-6 text-zenthra-white">Are there interesting futures setups right now?</p>
                <div className="mt-5 space-y-2.5">
                  {DATA_POINTS.map((point, index) => (
                    <div key={point} className="flex items-center gap-3 text-xs">
                      <span className={`h-1.5 w-1.5 rounded-full ${index === 4 ? "bg-amber-400" : "bg-emerald-400"}`} />
                      <span className="flex-1 text-zenthra-muted">{point}</span>
                      <span className="font-mono text-[10px] text-zenthra-muted/70">{index === 4 ? "context" : "checked"}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-5 rounded-lg border border-zenthra-blue/25 bg-zenthra-blue/10 p-3">
                  <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-zenthra-blue-bright">
                    <span>Evidence status</span><span>5 / 5</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zenthra-blue/20">
                    <div className="h-full w-full rounded-full bg-zenthra-blue-bright" />
                  </div>
                  <p className="mt-2 text-[11px] leading-4 text-zenthra-muted">Each finding is kept close to its source.</p>
                </div>
              </div>
            </div>
            <div className="relative flex items-center justify-between border-t border-zenthra-border pt-4 text-[10px] text-zenthra-muted">
              <span>AI explains. Data decides.</span>
              <span className="font-mono">ZENTHRA / 01</span>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-zenthra-border bg-zenthra-surface/35">
        <div className="mx-auto grid max-w-7xl gap-6 px-5 py-8 sm:px-8 md:grid-cols-3 md:gap-10">
          <div className="md:col-span-1">
            <p className="text-xs uppercase tracking-[0.16em] text-zenthra-muted">Built for clarity</p>
            <p className="mt-2 text-sm leading-6 text-zenthra-white">A calmer interface for decisions that deserve more than a headline.</p>
          </div>
          <div className="grid grid-cols-2 gap-5 text-sm text-zenthra-muted sm:grid-cols-4 md:col-span-2 md:grid-cols-4">
            <div><p className="text-lg font-semibold text-zenthra-white">01</p><p className="mt-1 text-xs">Question-first</p></div>
            <div><p className="text-lg font-semibold text-zenthra-white">02</p><p className="mt-1 text-xs">Source-aware</p></div>
            <div><p className="text-lg font-semibold text-zenthra-white">03</p><p className="mt-1 text-xs">Risk-derived</p></div>
            <div><p className="text-lg font-semibold text-zenthra-white">04</p><p className="mt-1 text-xs">Honest fallback</p></div>
          </div>
        </div>
      </section>

      <section id="capabilities" className="mx-auto max-w-7xl px-5 py-24 sm:px-8 md:py-32">
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-zenthra-blue-bright">The intelligence layer</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">From open question to usable context.</h2>
          <p className="mt-5 text-base leading-7 text-zenthra-muted">Zenthra connects the reasoning layer with inspectable market data — so the answer is useful without pretending to be certain.</p>
        </div>
        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {CAPABILITIES.map((capability) => (
            <article key={capability.number} className="group rounded-xl border border-zenthra-border bg-zenthra-surface/65 p-6 transition hover:-translate-y-1 hover:border-zenthra-blue/50">
              <div className="flex items-start justify-between">
                <span className="font-mono text-xs text-zenthra-blue-bright">{capability.number}</span>
                <span className="text-xl text-zenthra-border transition group-hover:text-zenthra-blue">↗</span>
              </div>
              <h3 className="mt-12 text-lg font-medium">{capability.title}</h3>
              <p className="mt-3 text-sm leading-6 text-zenthra-muted">{capability.body}</p>
              <p className="mt-8 text-[10px] font-medium tracking-[0.16em] text-zenthra-muted">{capability.tag}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="method" className="border-y border-zenthra-border bg-zenthra-surface/35">
        <div className="mx-auto grid max-w-7xl gap-14 px-5 py-24 sm:px-8 md:py-32 lg:grid-cols-[0.7fr_1.3fr]">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-zenthra-blue-bright">The method</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">AI orchestrates. Data decides.</h2>
            <p className="mt-5 text-sm leading-6 text-zenthra-muted">The model helps plan and explain a research path. It does not invent prices, wallets, scores or risk levels. Missing evidence stays visible.</p>
            <Link href="/ai" className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-zenthra-blue-bright hover:text-zenthra-white">Explore the workspace <span>→</span></Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {WORKFLOW_STEPS.map(([number, title, description]) => (
              <div key={number} className="rounded-xl border border-zenthra-border bg-zenthra-black/45 p-5">
                <span className="font-mono text-xs text-zenthra-blue-bright">{number}</span>
                <h3 className="mt-8 text-base font-medium">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-zenthra-muted">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-7xl px-5 py-24 sm:px-8 md:py-32">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div className="max-w-xl">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-zenthra-blue-bright">Access</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Start with the question.</h2>
            <p className="mt-5 text-sm leading-6 text-zenthra-muted">Explore the core workspace first. Paid access can be enabled by the operator when the right research workflows are ready.</p>
          </div>
          <span className="w-fit rounded-full border border-zenthra-border px-3 py-1.5 text-xs text-zenthra-muted">Transparent by design</span>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {[
            ["Free", "Rp0", "Core intelligence access", "Ask questions and inspect available evidence."],
            ["Pro", "Contact", "Deeper research access", "Futures intelligence, smart money and monitoring when enabled."],
            ["Pro+", "Contact", "Advanced access", "Higher limits and expanded research workflows when enabled."],
          ].map(([name, price, label, description], index) => (
            <div key={name} className={`rounded-xl border p-6 ${index === 1 ? "border-zenthra-blue/60 bg-zenthra-blue/10" : "border-zenthra-border bg-zenthra-surface/65"}`}>
              {index === 1 && <p className="mb-5 text-[10px] font-medium uppercase tracking-[0.16em] text-zenthra-blue-bright">Most useful next step</p>}
              <h3 className="text-lg font-medium">{name}</h3>
              <p className="mt-5 text-3xl font-semibold">{price}<span className="ml-1 text-sm font-normal text-zenthra-muted">{price === "Contact" ? "/mo" : ""}</span></p>
              <p className="mt-3 text-sm text-zenthra-white">{label}</p>
              <p className="mt-2 min-h-12 text-sm leading-6 text-zenthra-muted">{description}</p>
              <Link href="/ai" className={`mt-7 inline-flex w-full items-center justify-center rounded-lg px-4 py-3 text-sm font-medium ${index === 1 ? "bg-zenthra-blue text-white hover:bg-zenthra-blue-bright" : "border border-zenthra-border text-zenthra-white hover:border-zenthra-muted"}`}>Open workspace</Link>
            </div>
          ))}
        </div>
      </section>

      <section id="about" className="border-t border-zenthra-border bg-zenthra-surface/35">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-20 sm:px-8 md:grid-cols-[1fr_0.8fr] md:py-28">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-zenthra-blue-bright">A different standard</p>
            <h2 className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">Good intelligence is also clear about its limits.</h2>
          </div>
          <div className="text-sm leading-7 text-zenthra-muted">
            <p>Zenthra is built around a simple principle: research should make uncertainty easier to see, not easier to ignore.</p>
            <p className="mt-4">A NO TRADE result is a valid result. An unavailable source is shown as unavailable. The system stays useful by staying honest.</p>
          </div>
        </div>
      </section>

      <section id="contact" className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <div className="rounded-2xl border border-zenthra-blue/30 bg-zenthra-blue/10 px-6 py-12 text-center sm:px-12">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-zenthra-blue-bright">Ready when you are</p>
          <h2 className="mx-auto mt-4 max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">Bring a question. Leave with context.</h2>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-zenthra-muted">Use the workspace to begin an evidence-first investigation into the on-chain world.</p>
          <Link href="/ai" className="mt-8 inline-flex items-center gap-2 rounded-lg bg-zenthra-blue px-5 py-3.5 text-sm font-semibold text-white hover:bg-zenthra-blue-bright">Open Zenthra AI <span>↗</span></Link>
        </div>
      </section>

      <footer className="border-t border-zenthra-border px-5 py-10 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 text-xs text-zenthra-muted sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-zenthra-white"><span className="flex h-6 w-6 items-center justify-center rounded bg-zenthra-blue text-[10px] text-white">Z</span> Zenthra</div>
            <p className="mt-3 max-w-md leading-5">AI-assisted on-chain research for clearer decisions.</p>
          </div>
          <div className="sm:text-right">
            <p>Research tooling only. Not financial advice.</p>
            <p className="mt-1">© {new Date().getFullYear()} Zenthra.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
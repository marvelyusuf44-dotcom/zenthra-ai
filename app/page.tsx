import Link from "next/link";

const CAPABILITIES = [
  {
    title: "Futures Intelligence",
    body: "Deterministic confluence scoring across structure, momentum, open interest, funding and context — with NO TRADE as a valid, honest outcome.",
  },
  {
    title: "Discovery, not lookup",
    body: "Ask about a theme or behavior. Zenthra plans the research and surfaces what's relevant — you rarely need to start from a wallet address.",
  },
  {
    title: "Evidence you can inspect",
    body: "Every score component, conflict, and risk level is traceable back to the tool call that produced it. Nothing is asserted without a source.",
  },
];

const WORKFLOW_STEPS = [
  "Question",
  "Intent",
  "Research Plan",
  "Market Scan",
  "Candidate Detection",
  "Derivatives & Structure",
  "Cross-check",
  "Confluence Score",
  "Decision & Risk",
];

const TIERS = [
  {
    name: "Free",
    price: "Rp0",
    period: "",
    description: "Limited core intelligence access.",
  },
  {
    name: "Pro",
    price: "Contact",
    period: "/mo",
    description: "Deeper research, futures intelligence, smart money, monitoring.",
  },
  {
    name: "Pro+",
    price: "Contact",
    period: "/mo",
    description: "Advanced research and higher limits.",
  },
];

export default function LandingPage() {
  return (
    <main>
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-zenthra-border bg-zenthra-black/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-lg font-semibold tracking-tight">Zenthra</span>
          <nav className="hidden gap-8 text-sm text-zenthra-muted md:flex">
            <a href="#capabilities" className="hover:text-zenthra-white">Capabilities</a>
            <a href="#workflow" className="hover:text-zenthra-white">Workflow</a>
            <a href="#pricing" className="hover:text-zenthra-white">Pricing</a>
            <a href="#about" className="hover:text-zenthra-white">About</a>
            <a href="#contact" className="hover:text-zenthra-white">Contact</a>
          </nav>
          <Link
            href="/ai"
            className="rounded-md bg-zenthra-blue px-4 py-2 text-sm font-medium text-white hover:bg-zenthra-blue-bright"
          >
            Open Zenthra AI
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 py-24 text-center">
        <p className="mb-4 text-sm uppercase tracking-[0.2em] text-zenthra-blue-bright">
          AI Agent for On-Chain Intelligence
        </p>
        <h1 className="mx-auto max-w-3xl text-4xl font-semibold leading-tight tracking-tight md:text-6xl">
          Intelligence for the On-Chain World.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-zenthra-muted">
          Ask a question. Zenthra does the research. Deterministic scoring, real
          market data, and honest evidence — never fabricated signals.
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <Link
            href="/ai"
            className="rounded-md bg-zenthra-blue px-6 py-3 text-sm font-medium text-white hover:bg-zenthra-blue-bright"
          >
            Ask Zenthra a question
          </Link>
        </div>
      </section>

      {/* What Zenthra is */}
      <section className="border-t border-zenthra-border bg-zenthra-surface/50 py-20">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-2xl font-semibold md:text-3xl">What Zenthra is</h2>
          <p className="mt-4 text-zenthra-muted">
            Zenthra orchestrates real market and derivatives data through an AI
            research layer. The AI plans research and explains findings — it
            never invents prices, scores, wallets, or risk levels. Every
            decision traces back to a deterministic calculation over real
            data.
          </p>
        </div>
      </section>

      {/* Capabilities */}
      <section id="capabilities" className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-center text-2xl font-semibold md:text-3xl">
          Intelligence capabilities
        </h2>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {CAPABILITIES.map((c) => (
            <div
              key={c.title}
              className="rounded-lg border border-zenthra-border bg-zenthra-surface p-6"
            >
              <h3 className="font-medium text-zenthra-blue-bright">{c.title}</h3>
              <p className="mt-2 text-sm text-zenthra-muted">{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* AI preview */}
      <section className="border-y border-zenthra-border bg-zenthra-surface/50 py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-semibold md:text-3xl">Ask Zenthra directly</h2>
          <p className="mt-4 text-zenthra-muted">
            &ldquo;Are there interesting futures setups right now?&rdquo;
          </p>
          <Link
            href="/ai"
            className="mt-8 inline-block rounded-md border border-zenthra-blue px-6 py-3 text-sm font-medium text-zenthra-blue-bright hover:bg-zenthra-blue-soft"
          >
            Open the AI workspace
          </Link>
        </div>
      </section>

      {/* Workflow */}
      <section id="workflow" className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-center text-2xl font-semibold md:text-3xl">Workflow</h2>
        <div className="mt-12 flex flex-wrap justify-center gap-3">
          {WORKFLOW_STEPS.map((step, i) => (
            <div key={step} className="flex items-center gap-3">
              <span className="rounded-full border border-zenthra-border bg-zenthra-surface px-4 py-2 text-xs text-zenthra-muted">
                {step}
              </span>
              {i < WORKFLOW_STEPS.length - 1 && (
                <span className="text-zenthra-border">→</span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-zenthra-border bg-zenthra-surface/50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-2xl font-semibold md:text-3xl">Pricing</h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-sm text-zenthra-muted">
            Tiers are hypotheses under evaluation, not finalized commercial
            commitments. Paid tiers activate manually via QRIS + admin review.
          </p>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {TIERS.map((t) => (
              <div
                key={t.name}
                className="rounded-lg border border-zenthra-border bg-zenthra-surface p-6"
              >
                <h3 className="font-medium">{t.name}</h3>
                <p className="mt-2 text-2xl font-semibold">
                  {t.price}
                  <span className="text-sm text-zenthra-muted">{t.period}</span>
                </p>
                <p className="mt-3 text-sm text-zenthra-muted">{t.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="mx-auto max-w-4xl px-6 py-20 text-center">
        <h2 className="text-2xl font-semibold md:text-3xl">About</h2>
        <p className="mt-4 text-zenthra-muted">
          Zenthra is built on a simple principle: AI orchestrates research,
          tools own the data, and deterministic math owns the decision.
          NO TRADE is treated as a first-class, correct outcome — not a
          failure to find a signal.
        </p>
      </section>

      {/* Contact */}
      <section id="contact" className="border-t border-zenthra-border bg-zenthra-surface/50 py-20">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h2 className="text-2xl font-semibold md:text-3xl">Contact</h2>
          <p className="mt-4 text-zenthra-muted">
            For access, partnerships, or questions, reach the team through the
            channel configured for this deployment.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zenthra-border px-6 py-10 text-center text-xs text-zenthra-muted">
        <p>
          Zenthra provides research tooling and confluence scoring for
          informational purposes only. Nothing on this site is financial
          advice, and no outcome or profit is guaranteed.
        </p>
        <p className="mt-2">© {new Date().getFullYear()} Zenthra.</p>
      </footer>
    </main>
  );
}

import Link from "next/link";
import { Sparkles, ArrowRight, Zap, Copy, MessageSquare } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* ── Navbar ─────────────────────────────────────────────────────── */}
      <header className="border-b border-border/40 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold tracking-tight">
              ProposalForge
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-lg px-2.5 h-8 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground"
            >
              Sign In
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-2.5 h-8 text-sm font-medium transition-colors hover:bg-primary/80"
            >
              Get Started <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="flex-1 flex items-center justify-center px-6 py-24">
        <div className="mx-auto max-w-3xl text-center space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/50 px-4 py-1.5 text-sm text-muted-foreground">
            <Zap className="h-3.5 w-3.5" />
            Powered by AI. Sounds like you.
          </div>

          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight leading-[1.1]">
            Stop writing proposals.
            <br />
            <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
              Start winning them.
            </span>
          </h1>

          <p className="mx-auto max-w-xl text-lg text-muted-foreground leading-relaxed">
            Paste a job description, pick your persona, click once. Get a
            tailored proposal, a client message, and 3 smart questions — all
            in&nbsp;seconds.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3 h-9 text-sm font-medium transition-colors hover:bg-primary/80"
            >
              Generate Your First Proposal{" "}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="#features"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 h-9 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground"
            >
              See How It Works
            </Link>
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────────── */}
      <section
        id="features"
        className="border-t border-border/40 bg-muted/30 px-6 py-20"
      >
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-3xl font-bold tracking-tight mb-12">
            Everything you need. Nothing you don&apos;t.
          </h2>

          <div className="grid gap-8 sm:grid-cols-3">
            {[
              {
                icon: Zap,
                title: "One-Click Generation",
                desc: "Paste a job post, select your persona, hit generate. Done in under 10 seconds.",
              },
              {
                icon: Copy,
                title: "Copy & Send",
                desc: "Every section has a copy button. Paste straight into Upwork, Fiverr, or email.",
              },
              {
                icon: MessageSquare,
                title: "Smart Questions",
                desc: "Three targeted questions that prove you actually read the listing — automatically.",
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-xl border border-border/50 bg-card p-6 space-y-3 hover:shadow-lg transition-shadow"
              >
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="border-t border-border/40 px-6 py-6">
        <div className="mx-auto max-w-6xl flex items-center justify-between text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} ProposalForge</span>
          <span>Built for freelancers who value their time.</span>
        </div>
      </footer>
    </div>
  );
}

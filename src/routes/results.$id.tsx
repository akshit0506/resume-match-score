import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Check, CheckCircle2, CircleHelp, Copy, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getScan } from "@/lib/ats.functions";
import { CATEGORY_LABELS, CATEGORY_WEIGHTS, VERDICT_LABELS, type CategoryKey } from "@/lib/scoring";
import type { AtsReport } from "@/lib/report";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/results/$id")({
  loader: async ({ params }) => {
    const scan = await getScan({ data: { id: params.id } });
    if (!scan) throw notFound();
    return scan;
  },
  head: ({ loaderData }) => {
    const r = loaderData?.report;
    const title = r ? `ATS score ${r.score}${r.job_title ? ` — ${r.job_title}` : ""} | Shortlist` : "ATS report | Shortlist";
    const desc = r ? `${VERDICT_LABELS[r.verdict]}. ${r.summary.slice(0, 140)}` : "ATS resume score report.";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary" },
        { name: "robots", content: "noindex" },
      ],
    };
  },
  notFoundComponent: () => (
    <main className="mx-auto max-w-xl px-6 py-24 text-center">
      <h1 className="text-3xl font-semibold">Report not found</h1>
      <Button asChild className="mt-6">
        <Link to="/">Run a new scan</Link>
      </Button>
    </main>
  ),
  component: Results,
});

function tone(score: number) {
  return score >= 80 ? "text-success" : score >= 60 ? "text-warning" : "text-destructive";
}
function barTone(score: number) {
  return score >= 80 ? "bg-success" : score >= 60 ? "bg-warning" : "bg-destructive";
}

function Dial({ score }: { score: number }) {
  const r = 70;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative size-48">
      <svg viewBox="0 0 160 160" className="size-full -rotate-90">
        <circle cx="80" cy="80" r={r} className="fill-none stroke-muted" strokeWidth="12" />
        <circle
          cx="80"
          cy="80"
          r={r}
          className={cn("fill-none transition-all", tone(score))}
          stroke="currentColor"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - score / 100)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-serif text-6xl font-semibold">{score}</span>
        <span className="text-xs uppercase tracking-widest text-muted-foreground">out of 100</span>
      </div>
    </div>
  );
}

function Section({ title, children, sub }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl bg-card p-6 shadow-card md:p-8">
      <h2 className="text-2xl font-semibold">{title}</h2>
      {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function SuggestionCard({ s, i }: { s: AtsReport["suggestions"][number]; i: number }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-lg border border-border bg-background p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="font-serif text-lg font-semibold text-accent">{String(i + 1).padStart(2, "0")}</span>
        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium">{s.section}</span>
        {s.keyword && (
          <span className="rounded-full border border-accent px-2.5 py-0.5 text-xs font-medium">+ {s.keyword}</span>
        )}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Original</p>
          <p className="text-sm text-muted-foreground line-through decoration-destructive/40">{s.original}</p>
        </div>
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Suggested</p>
          <p className="text-sm font-medium">{s.suggested}</p>
        </div>
      </div>
      <div className="mt-3 flex items-end justify-between gap-4">
        <p className="text-xs text-muted-foreground">{s.reason}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            navigator.clipboard.writeText(s.suggested);
            setCopied(true);
            toast.success("Copied");
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? <Check /> : <Copy />} Copy
        </Button>
      </div>
    </div>
  );
}

function Results() {
  const { report: r, resume_name } = Route.useLoaderData();
  const cats = Object.keys(CATEGORY_WEIGHTS) as CategoryKey[];
  const missingKw = r.keywords.filter((k) => k.resume_mentions === 0);
  const weakKw = r.keywords.filter((k) => k.resume_mentions === 1 && k.jd_mentions > 1);
  const sortedKw = [...r.keywords].sort(
    (a, b) => (a.importance === "required" ? 0 : 1) - (b.importance === "required" ? 0 : 1) || b.jd_mentions - a.jd_mentions,
  );

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-6 py-10">
      <section className="flex flex-col items-center gap-8 rounded-xl bg-card p-8 shadow-card md:flex-row md:p-10">
        <Dial score={r.score} />
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {[r.job_title, r.company].filter(Boolean).join(" · ") || "ATS match report"}
          </p>
          <h1 className={cn("mt-2 text-4xl font-semibold", tone(r.score))}>{VERDICT_LABELS[r.verdict]}</h1>
          <p className="mt-3 text-base leading-relaxed">{r.summary}</p>
          {resume_name && <p className="mt-3 text-xs text-muted-foreground">Resume: {resume_name}</p>}
          <div className="mt-5 flex gap-2">
            <Button asChild>
              <Link to="/">Scan again</Link>
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                toast.success("Report link copied");
              }}
            >
              Copy link
            </Button>
          </div>
        </div>
      </section>

      {r.knockouts.some((k) => k.status !== "met") && (
        <section className="rounded-xl border border-destructive/40 bg-destructive/5 p-6">
          <h2 className="flex items-center gap-2 text-xl font-semibold text-destructive">
            <AlertTriangle className="size-5" /> Knock-out risks
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Many ATS filters auto-reject when a must-have isn't visible — regardless of the overall score.
          </p>
          <ul className="mt-4 space-y-2">
            {r.knockouts
              .filter((k) => k.status !== "met")
              .map((k, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  {k.status === "missing" ? (
                    <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
                  ) : (
                    <CircleHelp className="mt-0.5 size-4 shrink-0 text-warning" />
                  )}
                  <span>
                    <strong>{k.requirement}</strong> — {k.note}
                  </span>
                </li>
              ))}
          </ul>
        </section>
      )}

      <Section title="Score breakdown" sub="Weighted the way ATS ranking and recruiter screens prioritise.">
        <div className="space-y-5">
          {cats.map((k) => {
            const c = r.categories[k];
            return (
              <div key={k}>
                <div className="mb-1.5 flex items-baseline justify-between">
                  <span className="font-medium">
                    {CATEGORY_LABELS[k]}{" "}
                    <span className="text-xs text-muted-foreground">({CATEGORY_WEIGHTS[k]}%)</span>
                  </span>
                  <span className={cn("font-serif text-lg font-semibold", tone(c.score))}>{c.score}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className={cn("h-full rounded-full", barTone(c.score))} style={{ width: `${c.score}%` }} />
                </div>
                <p className="mt-1.5 text-sm text-muted-foreground">{c.notes}</p>
              </div>
            );
          })}
        </div>
      </Section>

      <Section
        title="Keywords"
        sub={`${r.keywords.length - missingKw.length} of ${r.keywords.length} matched · ${missingKw.length} missing · ${weakKw.length} mentioned only once`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="py-2 pr-4">Keyword</th>
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4 text-center">In job</th>
                <th className="py-2 pr-4 text-center">In resume</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {sortedKw.map((k, i) => (
                <tr key={i} className="border-b border-border/60">
                  <td className="py-2.5 pr-4 font-medium">{k.term}</td>
                  <td className="py-2.5 pr-4 capitalize text-muted-foreground">{k.importance}</td>
                  <td className="py-2.5 pr-4 text-center">{k.jd_mentions}</td>
                  <td className="py-2.5 pr-4 text-center">{k.resume_mentions}</td>
                  <td className="py-2.5">
                    {k.resume_mentions === 0 ? (
                      <span className="text-destructive">Missing</span>
                    ) : k.resume_mentions === 1 && k.jd_mentions > 1 ? (
                      <span className="text-warning">Once</span>
                    ) : (
                      <span className="text-success">Found</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        title="Suggested edits"
        sub="Rewordings that use the job's language for work you've already done — nothing invented."
      >
        <div className="space-y-4">
          {r.suggestions.map((s, i) => (
            <SuggestionCard key={i} s={s} i={i} />
          ))}
        </div>
      </Section>

      <div className="grid gap-6 md:grid-cols-2">
        <Section title="Strengths">
          <ul className="space-y-2">
            {r.strengths.map((s, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" /> {s}
              </li>
            ))}
          </ul>
        </Section>
        <Section title="Formatting & parsing">
          {r.formatting_issues.length === 0 ? (
            <p className="text-sm text-muted-foreground">No parsing risks found.</p>
          ) : (
            <ul className="space-y-2">
              {r.formatting_issues.map((s, i) => (
                <li key={i} className="flex gap-2 text-sm">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" /> {s}
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
      <p className="pb-6 text-center text-xs text-muted-foreground">
        Scores estimate how ATS software and recruiters screen resumes; every company configures its system differently.
      </p>
    </main>
  );
}

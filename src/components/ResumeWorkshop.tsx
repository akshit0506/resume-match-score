import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Check, Download, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { analyzeResume } from "@/lib/ats.functions";
import { readEditor, saveEditor, type EditorDocuments } from "@/lib/editor-session";
import { liveKeywordCoverage, countTerm } from "@/lib/evidence";
import type { AtsReport } from "@/lib/report";

export function ResumeWorkshop({ id, report }: { id: string; report: AtsReport }) {
  const [source, setSource] = useState<EditorDocuments | null>(null);
  const [text, setText] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const analyze = useServerFn(analyzeResume);
  const navigate = useNavigate();
  useEffect(() => {
    const documents = readEditor(id);
    setSource(documents); setText(documents?.resume ?? "");
    setAnswers({}); setAdded(new Set());
  }, [id]);
  const gaps = (report.criteria ?? []).filter((c) => c.status !== "met" && c.category !== "formatting" && c.category !== "impact");
  const coverage = liveKeywordCoverage(report, text);
  const baseline = source ? liveKeywordCoverage(report, source.resume) : 0;
  const changed = source && source.resume !== text;
  const recheck = async () => {
    if (!source || busy) return;
    setBusy(true);
    try {
      const result = await analyze({ data: { resume: { kind: "text", name: source.name, text }, job: { kind: "text", name: "Original job description", text: source.job } } });
      saveEditor(result.id, result.documents);
      sessionStorage.setItem(`shortlist-comparison:${result.id}`, JSON.stringify({ score: report.score, id }));
      await navigate({ to: "/results/$id", params: { id: result.id } });
      toast.success("Revised resume scored");
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };
  const apply = (original: string, suggested: string) => {
    if (!text.includes(original)) { toast.error("That original line has changed. Review your current resume."); return; }
    setText(text.replace(original, suggested));
    toast.success("Edit added to your draft");
  };
  if (!source) return (
    <section className="border-y border-border py-6">
      <h2 className="text-2xl font-semibold">Improve this resume</h2>
      <p className="mt-2 text-sm text-muted-foreground">Source documents aren’t available in this tab. Your shared report doesn’t include the full resume.</p>
      <Button className="mt-4" onClick={() => navigate({ to: "/" })}>Upload documents for a new scan <ArrowRight /></Button>
    </section>
  );
  return (
    <section className="border-y border-border py-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-xs font-semibold uppercase text-accent">Your next revision</p><h2 className="mt-1 text-3xl font-semibold">Make your experience count</h2></div>
        <div className="text-right" aria-live="polite"><p className="text-xs text-muted-foreground">Live exact keyword coverage</p><p className="font-serif text-3xl font-semibold">{coverage}% <span className="font-sans text-sm text-muted-foreground">{coverage - baseline > 0 ? "+" : ""}{coverage - baseline} pts</span></p></div>
      </div>
      <Tabs defaultValue="edits">
        <TabsList className="mb-5"><TabsTrigger value="edits">Suggested edits</TabsTrigger><TabsTrigger value="gaps">Gap questions ({gaps.length})</TabsTrigger></TabsList>
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <TabsContent value="edits" className="mt-0 max-h-[540px] space-y-3 overflow-y-auto">
              {report.suggestions.length === 0 && <p className="text-sm text-muted-foreground">No supported rewrites found. Review the gap questions.</p>}
              {report.suggestions.map((s, i) => <article key={i} className="rounded-lg border border-border p-4">
                <p className="text-xs font-semibold text-accent">{s.section}</p><p className="mt-2 text-sm">{s.suggested}</p><p className="mt-2 text-xs text-muted-foreground">{s.reason}</p>
                {s.evidence_quote && <blockquote className="mt-3 border-l-2 border-border pl-3 text-xs text-muted-foreground">{s.evidence_quote}</blockquote>}
                <Button variant="outline" size="sm" className="mt-3" disabled={busy || !text.includes(s.original)} onClick={() => apply(s.original, s.suggested)}><Check />Apply edit</Button>
              </article>)}
            </TabsContent>
            <TabsContent value="gaps" className="mt-0 max-h-[540px] space-y-3 overflow-y-auto">
              {gaps.length === 0 && <p className="text-sm text-success">No unresolved role criteria.</p>}
              {gaps.map((g, i) => {
                const key = `${g.category}:${g.requirement}`;
                return <article key={key} className="rounded-lg border border-border p-4">
                  <label htmlFor={`gap-${i}`} className="text-sm font-semibold">What existing experience demonstrates {g.requirement}?</label>
                  <p className="mt-2 text-xs text-muted-foreground">{g.note}</p>
                  {g.job_quote && <blockquote className="mt-2 border-l-2 border-border pl-3 text-xs text-muted-foreground">Job: “{g.job_quote}”</blockquote>}
                  <Textarea id={`gap-${i}`} className="mt-3 min-h-24" value={answers[key] ?? ""} disabled={busy || added.has(key)} onChange={(e) => setAnswers({ ...answers, [key]: e.target.value })} placeholder="Only facts you can stand behind: project, responsibilities, dates or outcomes. Leave blank if not applicable." />
                  <Button variant="outline" size="sm" className="mt-3" disabled={busy || added.has(key) || !(answers[key]?.trim())} onClick={() => {
                    const answer = answers[key]?.trim(); if (!answer) return;
                    setText((t) => `${t}\n\nAdditional relevant experience\n${answer}`);
                    setAdded((old) => new Set([...old, key]));
                  }}><Check />{added.has(key) ? "Added to draft" : "Add my evidence"}</Button>
                </article>;
              })}
            </TabsContent>
          </div>
          <div className="min-w-0">
            <label htmlFor="resume-draft" className="text-sm font-semibold">Your resume draft</label>
            <Textarea id="resume-draft" value={text} onChange={(e) => setText(e.target.value)} disabled={busy} className="mt-2 h-[430px] resize-y font-mono text-xs leading-relaxed" />
            <div className="mt-2 flex justify-between gap-2 text-xs text-muted-foreground"><span>Text draft · original layout not retained</span><span>{text.length.toLocaleString()} / 30,000</span></div>
            <p className="mt-3 text-xs text-muted-foreground">Keyword coverage is provisional, not your overall score. Re-analysis checks the revised evidence against the same job.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={recheck} disabled={busy || !changed || text.trim().length < 40 || text.length > 30000}>{busy ? <Loader2 className="animate-spin" /> : <ArrowRight />}{busy ? "Re-analyzing…" : "Re-score my draft"}</Button>
              <Button variant="outline" size="icon" title="Download text draft" aria-label="Download text draft" onClick={() => {
                const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
                const a = document.createElement("a"); a.href = url; a.download = "resume-revised.txt"; a.click(); URL.revokeObjectURL(url);
              }}><Download /></Button>
              <Button variant="ghost" size="icon" title="Reset draft" aria-label="Reset draft" disabled={busy || !changed} onClick={() => { setText(source.resume); setAdded(new Set()); }}><RotateCcw /></Button>
            </div>
          </div>
        </div>
      </Tabs>
      <input ref={fileRef} type="file" hidden />
    </section>
  );
}
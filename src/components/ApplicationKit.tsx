import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, Copy, Download, FilePenLine, Loader2, MessageSquare, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { applicationKitSchema, kitText, type ApplicationKit as Kit } from "@/lib/application-kit";
import { generateApplicationKit } from "@/lib/application.functions";
import type { EditorDocuments } from "@/lib/editor-session";

function download(text: string, name: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
  const link = document.createElement("a"); link.href = url; link.download = name; link.click(); URL.revokeObjectURL(url);
}

export function ApplicationKit({ id, source, resume, pending }: { id: string; source: EditorDocuments; resume: string; pending: boolean }) {
  const [kit, setKit] = useState<Kit | null>(null);
  const [generatedFrom, setGeneratedFrom] = useState("");
  const [cover, setCover] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const generate = useServerFn(generateApplicationKit);
  const storageKey = `getseen-kit:${id}`;
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(storageKey) ?? "null");
      const parsed = applicationKitSchema.safeParse(saved?.kit);
      if (parsed.success) {
        setKit(parsed.data); setGeneratedFrom(saved.resume ?? "");
        setCover(typeof saved.cover === "string" ? saved.cover : kitText(parsed.data, "cover"));
        setLinkedin(typeof saved.linkedin === "string" ? saved.linkedin : kitText(parsed.data, "linkedin"));
        setNotes(saved.notes && typeof saved.notes === "object" ? saved.notes : {});
      }
    } catch { /* local storage may be disabled */ }
  }, [storageKey]);
  useEffect(() => {
    if (!kit) return;
    try { sessionStorage.setItem(storageKey, JSON.stringify({ kit, resume: generatedFrom, cover, linkedin, notes })); } catch { /* session-only drafts */ }
  }, [storageKey, kit, generatedFrom, cover, linkedin, notes]);
  const create = async () => {
    if (busy || pending) return;
    setBusy(true); setError(null);
    const currentResume = resume;
    try {
      const result = await generate({ data: { resume: currentResume, job: source.job } });
      if (!result.kit) { setError(result.error); return; }
      setKit(result.kit); setGeneratedFrom(currentResume);
      setCover(kitText(result.kit, "cover")); setLinkedin(kitText(result.kit, "linkedin"));
      setActive(0); setRevealed(false); setNotes({});
      toast.success("Your application kit is ready");
    } catch { setError("The application kit could not be completed. Your existing drafts are unchanged."); }
    finally { setBusy(false); }
  };
  const copy = async (text: string, which: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(which); toast.success("Copied"); }
    catch { toast.error("Copy wasn’t available. Download the text instead."); }
  };
  const stale = kit && resume !== generatedFrom;
  const question = kit?.interview[active];
  const notesText = kit ? kit.interview.map((q, i) => `${i + 1}. ${q.question}\n\n${notes[q.question] ?? ""}`).join("\n\n") : "";
  return <section className="mt-8 border-t border-border pt-8">
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-xs font-semibold uppercase text-accent">Beyond the resume</p><h2 className="mt-1 font-serif text-3xl font-semibold">Your application kit</h2><p className="mt-2 text-sm text-muted-foreground">Based on your current draft and this job. AI drafts need your review; no new experience is added.</p></div>
      <Button onClick={create} disabled={busy || pending || resume.trim().length < 40 || resume.length > 30000}><span>{busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}</span>{busy ? "Preparing your kit…" : kit ? "Regenerate kit" : "Create my application kit"}</Button>
    </div>
    {busy && <p role="status" className="mb-4 text-sm text-muted-foreground">Preparing drafts and interview questions from your existing evidence. You can keep editing your resume.</p>}
    {error && <p role="alert" className="mb-4 border-l-2 border-destructive pl-3 text-sm text-destructive">{error}</p>}
    {stale && <p role="status" className="mb-4 border-l-2 border-warning pl-3 text-sm text-warning">Your resume draft has changed. This kit still reflects the earlier draft.</p>}
    {!kit && !busy && <div className="grid gap-4 border-y border-border py-6 sm:grid-cols-3">
      <div><FilePenLine className="mb-2 size-5 text-accent" /><h3 className="text-sm font-semibold">Cover letter</h3></div>
      <div><Sparkles className="mb-2 size-5 text-accent" /><h3 className="text-sm font-semibold">LinkedIn headline & summary</h3></div>
      <div><MessageSquare className="mb-2 size-5 text-accent" /><h3 className="text-sm font-semibold">Interview practice</h3></div>
    </div>}
    {kit && <Tabs defaultValue="cover">
      <TabsList className="mb-5 grid h-auto w-full grid-cols-3 sm:w-auto sm:inline-flex">
        <TabsTrigger value="cover" className="whitespace-normal text-xs sm:text-sm">Cover letter</TabsTrigger><TabsTrigger value="linkedin" className="whitespace-normal text-xs sm:text-sm">LinkedIn</TabsTrigger><TabsTrigger value="interview" className="whitespace-normal text-xs sm:text-sm">Interview prep</TabsTrigger>
      </TabsList>
      <TabsContent value="cover" className="mt-0">
        <label htmlFor={`cover-${id}`} className="text-sm font-semibold">Cover letter draft</label>
        <Textarea id={`cover-${id}`} value={cover} onChange={(e) => { setCover(e.target.value); setCopied(null); }} className="mt-2 min-h-80 text-sm leading-relaxed" />
        <div className="mt-3 flex gap-2"><Button variant="outline" onClick={() => copy(cover, "cover")}>{copied === "cover" ? <Check /> : <Copy />}Copy letter</Button><Button variant="ghost" size="icon" aria-label="Download cover letter" title="Download cover letter" onClick={() => download(cover, "getseen-cover-letter.txt")}><Download /></Button></div>
        <details className="mt-4 text-sm"><summary className="cursor-pointer text-muted-foreground">Source evidence</summary><ul className="mt-2 space-y-2">{kit.cover_letter.filter((p) => p.evidence_quote).map((p, i) => <li key={i} className="border-l-2 border-border pl-3 text-muted-foreground">“{p.evidence_quote}”</li>)}</ul></details>
      </TabsContent>
      <TabsContent value="linkedin" className="mt-0">
        <label htmlFor={`linkedin-${id}`} className="text-sm font-semibold">LinkedIn headline & about draft</label><Textarea id={`linkedin-${id}`} value={linkedin} onChange={(e) => { setLinkedin(e.target.value); setCopied(null); }} className="mt-2 min-h-72 text-sm leading-relaxed" />
        <div className="mt-3 flex gap-2"><Button variant="outline" onClick={() => copy(linkedin, "linkedin")}>{copied === "linkedin" ? <Check /> : <Copy />}Copy LinkedIn draft</Button><Button variant="ghost" size="icon" aria-label="Download LinkedIn draft" title="Download LinkedIn draft" onClick={() => download(linkedin, "getseen-linkedin.txt")}><Download /></Button></div>
        <details className="mt-4 text-sm"><summary className="cursor-pointer text-muted-foreground">Source evidence</summary><ul className="mt-2 space-y-2">{[kit.linkedin_headline, ...kit.linkedin_summary].filter((p) => p.evidence_quote).map((p, i) => <li key={i} className="border-l-2 border-border pl-3 text-muted-foreground">“{p.evidence_quote}”</li>)}</ul></details>
      </TabsContent>
      <TabsContent value="interview" className="mt-0">
        <div className="grid gap-6 md:grid-cols-[220px_1fr]">
          <div className="space-y-1">{kit.interview.map((q, i) => <Button key={i} variant={i === active ? "secondary" : "ghost"} className="h-auto w-full justify-start whitespace-normal py-3 text-left text-sm" onClick={() => { setActive(i); setRevealed(false); }}>{i + 1}. {q.question}</Button>)}</div>
          {question && <div className="min-w-0"><p className="text-xs capitalize text-accent">{question.kind} · {active + 1} of {kit.interview.length}</p><h3 className="mt-2 font-serif text-2xl font-semibold">{question.question}</h3><p className="mt-2 text-sm text-muted-foreground">{question.why}</p>
            <label className="mt-5 block text-sm font-semibold" htmlFor={`practice-${id}`}>Your practice answer</label><Textarea id={`practice-${id}`} className="mt-2 min-h-40" value={notes[question.question] ?? ""} onChange={(e) => setNotes({ ...notes, [question.question]: e.target.value })} placeholder="Your own situation, actions, and outcome…" />
            <Button variant="outline" className="mt-3" onClick={() => setRevealed((v) => !v)}>{revealed ? "Hide talking points" : "Show talking points"}</Button>
            {revealed && <div className="mt-4 space-y-3 border-l-2 border-accent pl-4"><p className="text-sm text-muted-foreground">{question.evidence_quote ? `Your resume evidence: “${question.evidence_quote}”` : "No supporting experience was found. Be honest about this gap; don’t present an invented example."}</p><ul className="list-inside list-disc space-y-1 text-sm">{question.prompts.map((p, i) => <li key={i}>{p}</li>)}</ul><p className="text-xs text-muted-foreground">Job context: “{question.job_quote}”</p></div>}
          </div>}
        </div>
        <div className="mt-6 border-t border-border pt-5"><h3 className="text-lg font-semibold">Questions for your interviewer</h3><ul className="mt-3 list-inside list-disc space-y-2 text-sm">{kit.questions_to_ask.map((q, i) => <li key={i}>{q}</li>)}</ul><Button variant="outline" className="mt-4" onClick={() => download(notesText, "getseen-interview-notes.txt")}><Download />Download practice notes</Button><p className="mt-3 text-xs text-muted-foreground">Practice questions, not the employer’s actual interview questions. Notes and drafts stay in this tab.</p></div>
      </TabsContent>
    </Tabs>}
  </section>;
}
import { useEffect, useState } from "react";
import { Eye, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { recruiterSignals } from "@/lib/application-kit";
import { VERDICT_LABELS } from "@/lib/scoring";
import type { AtsReport } from "@/lib/report";

export function RecruiterView({ report }: { report: AtsReport }) {
  const [open, setOpen] = useState(false);
  const [remaining, setRemaining] = useState(6);
  const [round, setRound] = useState(0);
  const { proof, unresolved } = recruiterSignals(report);
  useEffect(() => {
    if (!open) return;
    setRemaining(6);
    const timer = setInterval(() => setRemaining((n) => Math.max(0, n - 1)), 1000);
    return () => clearInterval(timer);
  }, [open, round]);
  return <>
    <Button variant="outline" onClick={() => setOpen(true)}><Eye />Recruiter 6-second view</Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto">
        <div className="flex items-start justify-between gap-4 pr-5">
          <div><DialogTitle className="font-serif text-3xl">The first impression</DialogTitle><DialogDescription className="mt-2">A quick-review exercise, not a prediction of recruiter behavior.</DialogDescription></div>
          <span className="min-w-12 text-right font-serif text-3xl text-accent" aria-live="polite">{remaining}s</span>
        </div>
        <div className="border-y border-border py-4"><p className="text-xs text-muted-foreground">Target role</p><h3 className="font-serif text-2xl">{report.job_title ?? "Your target role"}</h3><p className="mt-1 text-sm">{VERDICT_LABELS[report.verdict]} · {report.score}/100 documented coverage</p></div>
        <div><h4 className="text-sm font-semibold">What stands out</h4>
          {proof.length ? <ul className="mt-3 space-y-3">{proof.map((c, i) => <li key={i}><p className="text-sm font-semibold">{c.requirement}</p><blockquote className="mt-1 text-sm text-muted-foreground">“{c.resume_quote}”</blockquote></li>)}</ul> : <p className="mt-2 text-sm text-muted-foreground">No verified highlights in this report. Re-scan for an evidence-based view.</p>}
        </div>
        <div className="border-t border-border pt-4"><h4 className="text-sm font-semibold">What may prompt a question</h4><ul className="mt-2 space-y-2">{unresolved.map((c, i) => <li key={i} className="text-sm text-warning">{c.requirement} — {c.status === "missing" ? "unmet" : "not fully demonstrated"}</li>)}</ul>{!unresolved.length && <p className="mt-2 text-sm text-muted-foreground">No unresolved mandatory role criteria in this report.</p>}</div>
        {remaining === 0 && <p className="text-sm text-muted-foreground">Time’s up. Does your strongest evidence stand out as quickly in your actual resume?</p>}
        <Button variant="ghost" className="justify-self-start" onClick={() => setRound((n) => n + 1)}><RotateCcw />Replay six seconds</Button>
      </DialogContent>
    </Dialog>
  </>;
}
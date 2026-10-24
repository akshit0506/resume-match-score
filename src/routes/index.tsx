import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { FileText, Link2, Loader2, Upload, ClipboardPaste, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { analyzeResume, fetchJobFromUrl } from "@/lib/ats.functions";
import { parseFile, type ParsedDoc } from "@/lib/parse-file";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Shortlist — Check your resume's ATS score for any job" },
      {
        name: "description",
        content: "Upload your resume and a job description to get an ATS match score, missing keywords, and precise edits.",
      },
      { property: "og:title", content: "Shortlist — ATS Resume Score Checker" },
      {
        property: "og:description",
        content: "Get an ATS match score and targeted fixes for your resume against any job description.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function FileDrop({
  doc,
  onDoc,
  label,
}: {
  doc: ParsedDoc | null;
  onDoc: (d: ParsedDoc | null) => void;
  label: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const handle = async (f?: File) => {
    if (!f) return;
    setBusy(true);
    try {
      onDoc(await parseFile(f));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  if (doc)
    return (
      <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <FileText className="size-5 text-accent" />
          <span className="text-sm font-medium">{doc.name}</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => onDoc(null)} aria-label="Remove file">
          <X />
        </Button>
      </div>
    );
  return (
    <button
      type="button"
      onClick={() => ref.current?.click()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        handle(e.dataTransfer.files[0]);
      }}
      className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-input bg-card/60 text-muted-foreground transition-colors hover:border-accent hover:text-foreground"
    >
      {busy ? <Loader2 className="size-6 animate-spin" /> : <Upload className="size-6" />}
      <span className="text-sm font-medium">{label}</span>
      <span className="text-xs">PDF or Word (.docx), up to 10MB</span>
      <input
        ref={ref}
        type="file"
        hidden
        accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={(e) => handle(e.target.files?.[0])}
      />
    </button>
  );
}

const STEPS = ["Reading documents", "Extracting job requirements", "Matching keywords", "Scoring & writing edits"];

function Index() {
  const navigate = useNavigate();
  const analyze = useServerFn(analyzeResume);
  const fetchUrl = useServerFn(fetchJobFromUrl);
  const [resume, setResume] = useState<ParsedDoc | null>(null);
  const [jdTab, setJdTab] = useState("paste");
  const [jdText, setJdText] = useState("");
  const [jdFile, setJdFile] = useState<ParsedDoc | null>(null);
  const [jdUrl, setJdUrl] = useState("");
  const [fetching, setFetching] = useState(false);
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(0);

  const loadUrl = async () => {
    setFetching(true);
    try {
      const { text } = await fetchUrl({ data: { url: jdUrl } });
      setJdText(text);
      setJdTab("paste");
      toast.success("Job description loaded — review it below.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setFetching(false);
    }
  };

  const job: ParsedDoc | null =
    jdTab === "upload" ? jdFile : jdText.trim().length >= 40 ? { kind: "text", name: "job", text: jdText } : null;

  const run = async () => {
    if (!resume) { toast.error("Please upload your resume."); return; }
    if (!job) { toast.error("Please add the job description."); return; }
    setRunning(true);
    setStep(0);
    const t = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 9000);
    try {
      const { id } = await analyze({ data: { resume, job } });
      navigate({ to: "/results/$id", params: { id } });
    } catch (e) {
      toast.error((e as Error).message || "Something went wrong.");
      setRunning(false);
    } finally {
      clearInterval(t);
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-6 py-12 md:py-16">
      <section className="mb-12 max-w-3xl">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-accent">
          Resume × Job description
        </p>
        <h1 className="text-4xl font-semibold leading-[1.05] md:text-6xl">
          Will your resume make the shortlist?
        </h1>
        <p className="mt-5 text-lg text-muted-foreground">
          We score your resume the way applicant tracking systems and recruiters screen it — keywords,
          title match, must-haves and parseability — then show exactly what to reword, without changing
          your story.
        </p>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl bg-card p-6 shadow-card">
          <h2 className="mb-1 text-xl font-semibold">1. Your resume</h2>
          <p className="mb-4 text-sm text-muted-foreground">The version you plan to submit.</p>
          <FileDrop doc={resume} onDoc={setResume} label="Drop or choose your resume" />
        </div>

        <div className="rounded-xl bg-card p-6 shadow-card">
          <h2 className="mb-1 text-xl font-semibold">2. The job description</h2>
          <p className="mb-4 text-sm text-muted-foreground">Paste it, upload it, or give us the link.</p>
          <Tabs value={jdTab} onValueChange={setJdTab}>
            <TabsList className="mb-3 grid w-full grid-cols-3">
              <TabsTrigger value="paste">
                <ClipboardPaste className="mr-1 size-4" /> Paste
              </TabsTrigger>
              <TabsTrigger value="upload">
                <Upload className="mr-1 size-4" /> Upload
              </TabsTrigger>
              <TabsTrigger value="link">
                <Link2 className="mr-1 size-4" /> Link
              </TabsTrigger>
            </TabsList>
            <TabsContent value="paste">
              <Textarea
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                placeholder="Paste the full job description here…"
                className="h-40 resize-none bg-background"
              />
            </TabsContent>
            <TabsContent value="upload">
              <FileDrop doc={jdFile} onDoc={setJdFile} label="Drop or choose the job description" />
            </TabsContent>
            <TabsContent value="link">
              <div className="flex h-40 flex-col justify-center gap-3">
                <Input
                  value={jdUrl}
                  onChange={(e) => setJdUrl(e.target.value)}
                  placeholder="https://company.com/careers/role"
                  className="bg-background"
                />
                <Button variant="outline" onClick={loadUrl} disabled={!jdUrl || fetching}>
                  {fetching && <Loader2 className="animate-spin" />} Fetch job description
                </Button>
                <p className="text-xs text-muted-foreground">
                  Some sites (like LinkedIn) need a login — if fetching fails, paste the text instead.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <div className="mt-8 flex flex-col items-center gap-3">
        <Button size="lg" className="h-12 px-10 text-base" onClick={run} disabled={running}>
          {running ? (
            <>
              <Loader2 className="animate-spin" /> {STEPS[step]}…
            </>
          ) : (
            "Score my resume"
          )}
        </Button>
        <p className="text-xs text-muted-foreground">
          {running ? "This usually takes 30–60 seconds." : "Free. Sign in to keep a history of your scans."}
        </p>
      </div>
    </main>
  );
}

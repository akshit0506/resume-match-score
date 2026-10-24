import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod/v4";
import { CATEGORY_WEIGHTS, computeOverallScore, getVerdict, type CategoryKey } from "./scoring";
import type { AtsReport } from "./report";

const MAX_TEXT = 30_000;

type DocInput =
  | { kind: "pdf"; name: string; base64: string }
  | { kind: "text"; name: string; text: string };

type AnalyzeInput = { resume: DocInput; job: DocInput };

function validateDoc(d: unknown, label: string): DocInput {
  const doc = d as DocInput;
  if (!doc || (doc.kind !== "pdf" && doc.kind !== "text")) throw new Error(`Missing ${label}.`);
  if (doc.kind === "pdf") {
    if (typeof doc.base64 !== "string" || !doc.base64) throw new Error(`Empty ${label}.`);
    if (doc.base64.length > 14_000_000) throw new Error(`${label} is larger than 10MB.`);
  } else {
    if (typeof doc.text !== "string" || doc.text.trim().length < 40)
      throw new Error(`The ${label} looks too short.`);
    doc.text = doc.text.slice(0, MAX_TEXT);
  }
  return { ...doc, name: String(doc.name ?? label).slice(0, 200) };
}

const catSchema = z.object({ score: z.number(), notes: z.string() });
const reportSchema = z.object({
  job_title: z.string().nullable(),
  company: z.string().nullable(),
  summary: z.string(),
  categories: z.object({
    hard_skills: catSchema,
    title_alignment: catSchema,
    experience: catSchema,
    requirements: catSchema,
    soft_skills: catSchema,
    formatting: catSchema,
    impact: catSchema,
  }),
  keywords: z.array(
    z.object({
      term: z.string(),
      importance: z.enum(["required", "preferred"]),
      jd_mentions: z.number(),
      resume_mentions: z.number(),
    }),
  ),
  knockouts: z.array(
    z.object({
      requirement: z.string(),
      status: z.enum(["met", "missing", "unclear"]),
      note: z.string(),
    }),
  ),
  formatting_issues: z.array(z.string()),
  strengths: z.array(z.string()),
  suggestions: z.array(
    z.object({
      section: z.string(),
      original: z.string(),
      suggested: z.string(),
      reason: z.string(),
      keyword: z.string().nullable(),
    }),
  ),
});

const INSTRUCTIONS = `You are an expert ATS (Applicant Tracking System) analyst who replicates how Workday, Greenhouse, Lever, iCIMS and Taleo parse and rank resumes, plus how recruiters skim them.

Evaluate the RESUME against the JOB DESCRIPTION. Score each category 0-100 honestly (do not inflate):
- hard_skills: tools, technologies, methods, domain terms from the JD. Count exact matches and accept common synonyms/acronyms (JS = JavaScript, ML = machine learning) but note that many ATS only match exact phrasing.
- title_alignment: how closely past titles and the summary match the target role title and seniority.
- experience: years and level of relevant experience vs. what the JD asks.
- requirements: degrees, certifications, licenses, clearances, location/work authorization, and other explicit must-haves.
- soft_skills: leadership, communication, collaboration, and coverage of the JD's listed responsibilities.
- formatting: parseability — standard section headings (Experience, Education, Skills), clear dates (Month YYYY), contact info present, no reliance on tables/columns/graphics/headers-footers for key info, consistent structure, reasonable length.
- impact: quantified achievements (numbers, %, $, scale).

keywords: list the 15-30 most important JD keywords/phrases. importance = required if the JD presents it as required/must-have or repeats it, else preferred. jd_mentions and resume_mentions are integer counts (0 if absent).
knockouts: list every explicit must-have requirement from the JD (max 8) with met/missing/unclear.
formatting_issues: concrete parsing risks you observe (empty array if none).
strengths: 3-5 short points.
suggestions: 6-12 precise edits ordered by impact. Each must quote an ORIGINAL line or phrase from the resume (or "(new line)" for skills-section additions) and give a SUGGESTED rewrite.
CRITICAL RULES for suggestions: never invent employers, titles, dates, degrees, metrics, tools or work the candidate did not do. Only reword, reorder, use the JD's exact terminology for things already evidenced in the resume, surface skills that are clearly implied by existing work, or recommend a placeholder like "[add metric]" when a number is missing. Keep the meaning of the original work intact. In reason, explain which keyword or ATS rule it addresses. If a JD skill is genuinely absent, do not fake it — mention it in the summary as a real gap.
summary: 2-3 sentences giving a frank verdict on whether to submit as-is.
Also extract job_title and company from the JD (null if unknown).`;

async function getOptionalUserId(): Promise<string | null> {
  const auth = getRequest().headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.auth.getUser(auth.slice(7));
  return data.user?.id ?? null;
}

function docParts(doc: DocInput, label: string) {
  if (doc.kind === "pdf") {
    return [
      { type: "text" as const, text: `=== ${label} (attached PDF: ${doc.name}) ===` },
      {
        type: "file" as const,
        data: doc.base64,
        mediaType: "application/pdf",
        filename: doc.name.endsWith(".pdf") ? doc.name : `${label}.pdf`,
      },
    ];
  }
  return [{ type: "text" as const, text: `=== ${label} ===\n${doc.text}` }];
}

function localFormattingChecks(doc: DocInput): string[] {
  if (doc.kind !== "text") return [];
  const t = doc.text;
  const issues: string[] = [];
  if (!/[\w.+-]+@[\w-]+\.[\w.]+/.test(t)) issues.push("No email address detected — ATS may fail to capture your contact info.");
  if (!/(\+?\d[\d\s().-]{7,}\d)/.test(t)) issues.push("No phone number detected.");
  for (const h of ["experience", "education", "skills"]) {
    if (!new RegExp(`(^|\\n)\\s*[^\\n]{0,20}${h}`, "i").test(t))
      issues.push(`No clear "${h.charAt(0).toUpperCase() + h.slice(1)}" section heading found.`);
  }
  return issues;
}

export const analyzeResume = createServerFn({ method: "POST" })
  .validator((input: AnalyzeInput) => ({
    resume: validateDoc(input?.resume, "resume"),
    job: validateDoc(input?.job, "job description"),
  }))
  .handler(async ({ data }) => {
    const userId = await getOptionalUserId();
    const { streamText, Output, NoObjectGeneratedError } = await import("ai");
    const { createGatewayProvider } = await import("./ai.server");
    const provider = createGatewayProvider();

    const result = streamText({
      model: provider.responses("openai/gpt-6-astra"),
      instructions: INSTRUCTIONS,
      output: Output.object({ schema: reportSchema }),
      messages: [
        {
          role: "user",
          content: [...docParts(data.job, "JOB DESCRIPTION"), ...docParts(data.resume, "RESUME")],
        },
      ],
      providerOptions: {
        openai: {
          forceReasoning: true,
          reasoningEffort: "medium",
          reasoningSummary: "auto",
          store: false,
          include: ["reasoning.encrypted_content"],
        },
      },
    } as Parameters<typeof streamText>[0]);

    let raw: z.infer<typeof reportSchema>;
    try {
      raw = (await result.output) as z.infer<typeof reportSchema>;
    } catch (err) {
      if (NoObjectGeneratedError.isInstance(err)) {
        throw new Error("The analysis came back incomplete. Please try again.");
      }
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 429) throw new Error("Too many requests right now — please wait a moment and try again.");
      if (status === 402) throw new Error("AI credits have run out for this workspace.");
      console.error("analyzeResume failed", err);
      throw new Error((err as Error).message || "Analysis failed.");
    }

    const categories = {} as AtsReport["categories"];
    for (const k of Object.keys(CATEGORY_WEIGHTS) as CategoryKey[]) {
      const c = raw.categories[k];
      categories[k] = { score: Math.max(0, Math.min(100, Math.round(c?.score ?? 0))), notes: c?.notes ?? "" };
    }
    const score = computeOverallScore(
      Object.fromEntries(Object.entries(categories).map(([k, v]) => [k, v.score])) as Record<CategoryKey, number>,
    );
    const missing = raw.knockouts.filter((k) => k.status === "missing").length;
    const report: AtsReport = {
      job_title: raw.job_title,
      company: raw.company,
      summary: raw.summary,
      score,
      verdict: getVerdict(score, missing),
      categories,
      keywords: raw.keywords.map((k) => ({
        ...k,
        jd_mentions: Math.max(0, Math.round(k.jd_mentions)),
        resume_mentions: Math.max(0, Math.round(k.resume_mentions)),
      })),
      knockouts: raw.knockouts,
      formatting_issues: [...new Set([...localFormattingChecks(data.resume), ...raw.formatting_issues])],
      strengths: raw.strengths,
      suggestions: raw.suggestions,
    };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("scans")
      .insert({
        user_id: userId,
        job_title: report.job_title,
        company: report.company,
        resume_name: data.resume.name,
        score: report.score,
        verdict: report.verdict,
        report: report as never,
      })
      .select("id")
      .single();
    if (error) {
      console.error(error);
      throw new Error("Couldn't save the report.");
    }
    return { id: row.id as string };
  });

export const getScan = createServerFn({ method: "GET" })
  .validator((input: { id: string }) => {
    if (!/^[0-9a-f-]{36}$/i.test(input?.id ?? "")) throw new Error("Invalid report link.");
    return input;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("scans")
      .select("id, resume_name, created_at, report")
      .eq("id", data.id)
      .maybeSingle();
    if (!row) return null;
    return {
      id: row.id as string,
      resume_name: row.resume_name as string | null,
      created_at: row.created_at as string,
      report: row.report as unknown as AtsReport,
    };
  });

export const fetchJobFromUrl = createServerFn({ method: "POST" })
  .validator((input: { url: string }) => {
    let u: URL;
    try {
      u = new URL(input?.url);
    } catch {
      throw new Error("That doesn't look like a valid link.");
    }
    if (!/^https?:$/.test(u.protocol)) throw new Error("Only http(s) links are supported.");
    if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(u.hostname))
      throw new Error("That link isn't reachable.");
    return { url: u.toString() };
  })
  .handler(async ({ data }) => {
    let html = "";
    try {
      const res = await fetch(data.url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; ATSScoreBot/1.0)",
          Accept: "text/html,application/xhtml+xml",
        },
        redirect: "follow",
      });
      if (!res.ok) throw new Error(String(res.status));
      html = (await res.text()).slice(0, 2_000_000);
    } catch {
      throw new Error("Couldn't open that page. Please paste the job description text instead.");
    }
    // Prefer JSON-LD JobPosting when present (most job boards include it).
    const ld = [...html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)];
    for (const m of ld) {
      try {
        const parsed = JSON.parse(m[1] ?? "");
        const items = Array.isArray(parsed) ? parsed : parsed["@graph"] ?? [parsed];
        const job = items.find((i: { "@type"?: string }) => i?.["@type"] === "JobPosting");
        if (job?.description) {
          const text = `${job.title ?? ""}\n${job.hiringOrganization?.name ?? ""}\n\n${stripHtml(job.description)}`;
          if (text.length > 200) return { text: text.slice(0, MAX_TEXT) };
        }
      } catch {
        /* ignore */
      }
    }
    const body = html.match(/<main[\s\S]*?<\/main>/i)?.[0] ?? html.match(/<body[\s\S]*<\/body>/i)?.[0] ?? html;
    const text = stripHtml(body);
    if (text.length < 300)
      throw new Error("That page didn't expose the job text (it may need a login). Please paste it instead.");
    return { text: text.slice(0, MAX_TEXT) };
  });

function stripHtml(s: string) {
  return s
    .replace(/<(script|style|noscript|svg|nav|footer|header)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>|<\/(p|div|li|h\d)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n\n")
    .trim();
}

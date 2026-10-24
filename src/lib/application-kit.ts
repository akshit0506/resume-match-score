import { z } from "zod/v4";
import { hasQuote } from "./evidence";
import type { AtsReport } from "./report";

const passage = z.object({ text: z.string(), evidence_quote: z.string().nullable() });
export const applicationKitSchema = z.object({
  cover_letter: z.array(passage),
  linkedin_headline: passage,
  linkedin_summary: z.array(passage),
  interview: z.array(z.object({
    question: z.string(),
    kind: z.enum(["technical", "behavioral", "gap"]),
    job_quote: z.string(),
    why: z.string(),
    evidence_quote: z.string().nullable(),
    prompts: z.array(z.string()),
  })),
  questions_to_ask: z.array(z.string()),
});
export type ApplicationKit = z.infer<typeof applicationKitSchema>;

export const applicationInputSchema = z.object({
  resume: z.string().min(40).max(30_000),
  job: z.string().min(40).max(30_000),
});

export function validateApplicationKit(kit: ApplicationKit, resume: string, job: string): ApplicationKit {
  const validPassage = (p: z.infer<typeof passage>) => {
    if (!p.text.trim()) return false;
    if (p.evidence_quote !== null && !hasQuote(resume, p.evidence_quote)) return false;
    // New numerical claims cannot be introduced into an application draft.
    const numbers = new Set((p.evidence_quote ?? "").match(/\d+(?:[.,]\d+)*/g) ?? []);
    return !(p.text.match(/\d+(?:[.,]\d+)*/g) ?? []).some((n) => !numbers.has(n));
  };
  return {
    cover_letter: kit.cover_letter.filter(validPassage).slice(0, 5),
    linkedin_headline: validPassage(kit.linkedin_headline) ? kit.linkedin_headline : { text: "", evidence_quote: null },
    linkedin_summary: kit.linkedin_summary.filter(validPassage).slice(0, 4),
    interview: kit.interview.filter((q) => hasQuote(job, q.job_quote) && q.question.trim()).slice(0, 8).map((q) => ({
      ...q,
      evidence_quote: hasQuote(resume, q.evidence_quote) ? q.evidence_quote : null,
      prompts: q.prompts.slice(0, 4),
    })),
    questions_to_ask: kit.questions_to_ask.filter((q) => q.trim()).slice(0, 4),
  };
}

export function recruiterSignals(report: AtsReport) {
  const criteria = report.criteria ?? [];
  const seen = new Set<string>();
  const proof = criteria.filter((c) => {
    if (c.status !== "met" || !c.resume_quote || c.category === "formatting") return false;
    if (seen.has(c.resume_quote)) return false;
    seen.add(c.resume_quote); return true;
  }).slice(0, 3);
  const unresolved = criteria.filter((c) => c.importance === "required" && c.status !== "met" && c.category !== "formatting" && c.category !== "impact").slice(0, 3);
  return { proof, unresolved };
}

export function kitText(kit: ApplicationKit, type: "cover" | "linkedin") {
  if (type === "cover") return `Dear hiring team,\n\n${kit.cover_letter.map((p) => p.text).join("\n\n")}\n\nBest regards`;
  return `${kit.linkedin_headline.text}\n\n${kit.linkedin_summary.map((p) => p.text).join("\n\n")}`;
}
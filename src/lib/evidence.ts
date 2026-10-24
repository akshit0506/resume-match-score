import { CATEGORY_WEIGHTS, computeOverallScore, getVerdict, type CategoryKey } from "./scoring";
import type { AtsReport, Suggestion } from "./report";

export type EvidenceCriterion = {
  category: CategoryKey;
  requirement: string;
  importance: "required" | "preferred";
  status: "met" | "partial" | "missing" | "unclear";
  job_quote: string | null;
  resume_quote: string | null;
  note: string;
};

export const normalizeText = (s: string) => s.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
export function hasQuote(text: string, quote: string | null): boolean {
  return Boolean(quote?.trim() && normalizeText(text).includes(normalizeText(quote)));
}

export function countTerm(text: string, term: string): number {
  const escaped = normalizeText(term).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (!escaped) return 0;
  return [...normalizeText(text).matchAll(new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, "gu"))].length;
}

export function scoreEvidence(criteria: EvidenceCriterion[], resume: string, job: string) {
  const seen = new Set<string>();
  const verified = criteria.filter((c) => {
    const key = `${c.category}:${normalizeText(c.requirement)}`;
    if (seen.has(key)) return false;
    // Role requirements must actually occur in the supplied posting.
    if (c.category !== "formatting" && c.category !== "impact" && !hasQuote(job, c.job_quote)) return false;
    seen.add(key);
    return true;
  }).map((c) => ({
    ...c,
    status: (c.status === "met" || c.status === "partial") && !hasQuote(resume, c.resume_quote)
      ? "unclear" as const : c.status,
    resume_quote: hasQuote(resume, c.resume_quote) ? c.resume_quote : null,
  }));
  const categories = {} as AtsReport["categories"];
  for (const category of Object.keys(CATEGORY_WEIGHTS) as CategoryKey[]) {
    const items = verified.filter((c) => c.category === category);
    const total = items.reduce((n, c) => n + (c.importance === "required" ? 2 : 1), 0);
    const earned = items.reduce((n, c) => n + (c.importance === "required" ? 2 : 1) * (c.status === "met" ? 1 : c.status === "partial" ? 0.5 : 0), 0);
    categories[category] = {
      score: total ? Math.round(100 * earned / total) : 0,
      notes: items.length ? items.map((c) => `${c.requirement}: ${c.note}`).join(" ") : "Not enough verified evidence to assess this category.",
    };
  }
  const score = computeOverallScore(Object.fromEntries(Object.entries(categories).map(([k, v]) => [k, v.score])) as Record<CategoryKey, number>);
  const blockers = verified.filter((c) => c.category === "requirements" && c.importance === "required" && c.status !== "met");
  return { criteria: verified, categories, score, verdict: getVerdict(score, blockers.length) };
}

export function safeSuggestions(suggestions: Suggestion[], resume: string): Suggestion[] {
  const seen = new Set<string>();
  return suggestions.filter((s) => {
    if (!hasQuote(resume, s.original) || !hasQuote(resume, s.evidence_quote ?? s.original)) return false;
    // Never accept a new numerical claim, including invented percentages, years or dates.
    const oldNumbers = new Set((s.original + " " + (s.evidence_quote ?? "")).match(/\d+(?:[.,]\d+)*/g) ?? []);
    if ((s.suggested.match(/\d+(?:[.,]\d+)*/g) ?? []).some((n) => !oldNumbers.has(n))) return false;
    const key = normalizeText(s.original);
    if (seen.has(key) || normalizeText(s.original) === normalizeText(s.suggested)) return false;
    seen.add(key);
    return true;
  });
}

export function liveKeywordCoverage(report: AtsReport, text: string) {
  const relevant = report.keywords;
  const total = relevant.reduce((n, k) => n + (k.importance === "required" ? 2 : 1), 0);
  const matched = relevant.reduce((n, k) => n + (countTerm(text, k.term) > 0 ? (k.importance === "required" ? 2 : 1) : 0), 0);
  return total ? Math.round(100 * matched / total) : 0;
}
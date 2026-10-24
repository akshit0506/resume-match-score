export const CATEGORY_WEIGHTS = {
  hard_skills: 30,
  title_alignment: 15,
  experience: 15,
  requirements: 15,
  soft_skills: 10,
  formatting: 10,
  impact: 5,
} as const;

export type CategoryKey = keyof typeof CATEGORY_WEIGHTS;

export const CATEGORY_LABELS: Record<CategoryKey, string> = {
  hard_skills: "Hard skills & keywords",
  title_alignment: "Job title & role alignment",
  experience: "Experience level",
  requirements: "Must-have requirements",
  soft_skills: "Soft skills & responsibilities",
  formatting: "Parseability & formatting",
  impact: "Impact & measurable results",
};

export type Verdict = "ready" | "tweaks" | "not_yet";

export const VERDICT_LABELS: Record<Verdict, string> = {
  ready: "Ready to submit",
  tweaks: "Needs tweaks",
  not_yet: "Not a fit yet",
};

const clamp = (n: number) => (Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : 0);

export function computeOverallScore(scores: Record<CategoryKey, number>): number {
  let total = 0;
  for (const key of Object.keys(CATEGORY_WEIGHTS) as CategoryKey[]) {
    total += clamp(scores[key]) * CATEGORY_WEIGHTS[key];
  }
  return Math.round(total / 100);
}

/** 80+ ready, 60-79 tweaks, under 60 not yet. A missing must-have caps the verdict at "tweaks". */
export function getVerdict(score: number, missingKnockouts = 0): Verdict {
  if (score >= 80) return missingKnockouts > 0 ? "tweaks" : "ready";
  if (score >= 60) return "tweaks";
  return "not_yet";
}

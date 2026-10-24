import type { CategoryKey, Verdict } from "./scoring";

export type Keyword = {
  term: string;
  importance: "required" | "preferred";
  jd_mentions: number;
  resume_mentions: number;
};
export type Knockout = { requirement: string; status: "met" | "missing" | "unclear"; note: string };
export type Suggestion = {
  section: string;
  original: string;
  suggested: string;
  reason: string;
  keyword: string | null;
};

export type AtsReport = {
  job_title: string | null;
  company: string | null;
  summary: string;
  score: number;
  verdict: Verdict;
  categories: Record<CategoryKey, { score: number; notes: string }>;
  keywords: Keyword[];
  knockouts: Knockout[];
  formatting_issues: string[];
  strengths: string[];
  suggestions: Suggestion[];
};

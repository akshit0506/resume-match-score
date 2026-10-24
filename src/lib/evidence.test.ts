import { describe, expect, it } from "vitest";
import { countTerm, scoreEvidence, safeSuggestions, type EvidenceCriterion } from "./evidence";

const criterion = (changes: Partial<EvidenceCriterion> = {}): EvidenceCriterion => ({ category: "hard_skills", requirement: "Python", importance: "required", status: "met", job_quote: "Python required", resume_quote: "Built Python services", note: "Relevant project evidence", ...changes });
describe("evidence-based scoring", () => {
  it("does not credit invented resume evidence", () => {
    const r = scoreEvidence([criterion()], "Built Java services", "Python required");
    expect(r.categories.hard_skills.score).toBe(0);
    expect(r.criteria[0]?.status).toBe("unclear");
  });
  it("rejects requirements not in the job posting", () => {
    expect(scoreEvidence([criterion()], "Built Python services", "Java required").criteria).toHaveLength(0);
  });
  it("scores partial evidence at half credit", () => {
    expect(scoreEvidence([criterion({ status: "partial" })], "Built Python services", "Python required").categories.hard_skills.score).toBe(50);
  });
  it("weights required evidence twice preferred evidence", () => {
    const r = scoreEvidence([criterion(), criterion({ requirement: "SQL", importance: "preferred", status: "missing", job_quote: "SQL preferred", resume_quote: null })], "Built Python services", "Python required. SQL preferred");
    expect(r.categories.hard_skills.score).toBe(67);
  });
  it("keyword stuffing does not increase evidence score", () => {
    const a = scoreEvidence([criterion()], "Built Python services", "Python required");
    const b = scoreEvidence([criterion(), criterion()], "Built Python services Python Python Python", "Python required");
    expect(b.score).toBe(a.score);
  });
  it("counts whole terms and technical punctuation", () => {
    expect(countTerm("React reactive React.js C++ C C#", "React")).toBe(2);
    expect(countTerm("C++ C C#", "C++")).toBe(1);
  });
  it("rejects fabricated numbers and source quotes", () => {
    const s = { section: "Experience", original: "Built services", suggested: "Built 50 services", reason: "Impact", keyword: null, evidence_quote: "Built services" };
    expect(safeSuggestions([s], "Built services")).toHaveLength(0);
    expect(safeSuggestions([{ ...s, suggested: "Developed services", original: "Managed teams" }], "Built services")).toHaveLength(0);
    expect(safeSuggestions([{ ...s, suggested: "Developed services" }], "Built services")).toHaveLength(1);
  });
});
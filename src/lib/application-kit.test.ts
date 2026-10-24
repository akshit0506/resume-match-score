import { describe, expect, it } from "vitest";
import { applicationInputSchema, validateApplicationKit, recruiterSignals, type ApplicationKit } from "./application-kit";
import { CATEGORY_WEIGHTS, type CategoryKey } from "./scoring";
import type { AtsReport } from "./report";

const kit: ApplicationKit = {
  cover_letter: [{ text: "I built reporting services.", evidence_quote: "Built reporting services" }],
  linkedin_headline: { text: "Reporting services", evidence_quote: "Built reporting services" },
  linkedin_summary: [{ text: "I built reporting services.", evidence_quote: "Built reporting services" }],
  interview: [{ question: "How do you test a service?", kind: "technical", job_quote: "Automated testing required", why: "Testing quality", evidence_quote: "Imaginary tests", prompts: ["What tests did you write?"] }],
  questions_to_ask: ["What defines success in this role?"],
};
describe("faithful application kit", () => {
  it("rejects candidate claims with invented source quotes", () => {
    const result = validateApplicationKit(kit, "Different work", "Automated testing required");
    expect(result.cover_letter).toHaveLength(0);
    expect(result.linkedin_summary).toHaveLength(0);
  });
  it("rejects invented metrics in cover letters", () => {
    const result = validateApplicationKit({ ...kit, cover_letter: [{ text: "I built 50 reporting services.", evidence_quote: "Built reporting services" }] }, "Built reporting services", "Automated testing required");
    expect(result.cover_letter).toHaveLength(0);
  });
  it("keeps supported drafting without changing facts", () => {
    expect(validateApplicationKit(kit, "Built reporting services", "Automated testing required").cover_letter[0]?.text).toBe("I built reporting services.");
  });
  it("does not supply imaginary interview evidence", () => {
    expect(validateApplicationKit(kit, "Built reporting services", "Automated testing required").interview[0]?.evidence_quote).toBeNull();
  });
  it("excludes interview questions unrelated to the supplied posting", () => {
    expect(validateApplicationKit(kit, "Built reporting services", "Sales role").interview).toHaveLength(0);
  });
  it("enforces 30,000-character source limits", () => {
    expect(applicationInputSchema.safeParse({ resume: "x".repeat(30001), job: "j".repeat(40) }).success).toBe(false);
    expect(applicationInputSchema.safeParse({ resume: "x".repeat(30000), job: "j".repeat(40) }).success).toBe(true);
  });
  it("recruiter highlights exclude unclear claims and duplicate proof", () => {
    const c = { category: "hard_skills" as const, requirement: "Python", importance: "required" as const, status: "met" as const, job_quote: "Python", resume_quote: "Built Python services", note: "Evidence" };
    const report: AtsReport = { job_title: "Engineer", company: null, summary: "", score: 80, verdict: "ready", categories: Object.fromEntries(Object.keys(CATEGORY_WEIGHTS).map((k) => [k, { score: 80, notes: "" }])) as Record<CategoryKey, { score: number; notes: string }>, keywords: [], knockouts: [], formatting_issues: [], strengths: [], suggestions: [], criteria: [c, { ...c, requirement: "Services" }, { ...c, requirement: "Docker", status: "unclear", resume_quote: null }] };
    expect(recruiterSignals(report).proof).toHaveLength(1);
    expect(recruiterSignals(report).unresolved[0]?.requirement).toBe("Docker");
  });
});
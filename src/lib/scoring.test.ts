import { describe, expect, it } from "vitest";
import { computeOverallScore, getVerdict, CATEGORY_WEIGHTS } from "./scoring";

const all = (n: number) =>
  Object.fromEntries(Object.keys(CATEGORY_WEIGHTS).map((k) => [k, n])) as Parameters<
    typeof computeOverallScore
  >[0];

describe("scoring", () => {
  it("weights add up to 100", () => {
    expect(Object.values(CATEGORY_WEIGHTS).reduce((a, b) => a + b, 0)).toBe(100);
  });
  it("hard skills count for 30% of the score", () => {
    expect(computeOverallScore({ ...all(0), hard_skills: 100 })).toBe(30);
  });
  it("impact counts for 5% of the score", () => {
    expect(computeOverallScore({ ...all(0), impact: 100 })).toBe(5);
  });
  it("80 and above is ready to submit", () => {
    expect(getVerdict(80)).toBe("ready");
  });
  it("60 to 79 needs tweaks", () => {
    expect(getVerdict(79)).toBe("tweaks");
    expect(getVerdict(60)).toBe("tweaks");
  });
  it("under 60 is not a fit yet", () => {
    expect(getVerdict(59)).toBe("not_yet");
  });
  it("a missing must-have keeps a high score from being ready", () => {
    expect(getVerdict(92, 1)).toBe("tweaks");
  });
});

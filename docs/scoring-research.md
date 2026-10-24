# GetSeen scoring methodology — evidence v2

## Research conclusions

Reviewed 24 October 2026. Vendor documentation describes product behavior, not independently proven hiring accuracy. Exact proprietary formulas are generally undisclosed. GetSeen is not a reproduction of those formulas or a calibrated probability of an interview.

| Product | Published approach | Limits |
| --- | --- | --- |
| Jobscan | Hard skills, frequency and job title emphasized; word variations recognized | Full weights, semantic model and outcome calibration undisclosed |
| Resume Worded | Unequally weighted resume-writing checks; separate targeted keyword tool | Full weights and outcome validation undisclosed |
| Teal | Separate resume quality and job-match scores; included/missing keywords | Full formula and semantic thresholds undisclosed |
| SkillSyncer | Hard skills 60, soft skills 15, other keywords 5, title 10, degree 10 | Frequency and exact-title rules are product heuristics |
| Rezi | 23 audits in five categories; explicitly says they are not ATS scores | Full aggregation and outcome validation undisclosed |

### Consumer sources
- [Jobscan match guidance](https://jobscansupport.frontkb.com/en/articles/11538497)
- [Jobscan word-variation update](https://www.jobscan.co/blog/product-update-october-2023/)
- [Resume Worded weighting](https://help.resumeworded.com/article/33-how-is-my-score-calculated)
- [Resume Worded targeted matching](https://www.resumeworded.com/targeted-resume)
- [Teal analyzer](https://help.tealhq.com/en/articles/9524748-using-the-resume-analyzer)
- [Teal matcher](https://help.tealhq.com/en/articles/12060992-using-the-job-matcher)
- [SkillSyncer formula](https://support.skillsyncer.com/articles/0181576-how-your-match-score-is-calculated)
- [SkillSyncer frequency behavior](https://support.skillsyncer.com/articles/8131444-why-does-it-say-im-missing-a-skill-thats-already)
- [Rezi audit methodology](https://intercom.help/rezihelp/en/articles/12128510-check-rezi-score)

### Actual ATS behavior
Greenhouse distinguishes exact keyword filtering from optional employer-calibrated AI matching. Application auto-rejection rules operate on configured question answers; resume silence cannot establish those answers. A failed parse can leave the file attached for manual entry. Lever likewise separates readable parsing from file upload acceptance. Workday offers multiple configurable matching features; no single universal percentage applies.

- [Greenhouse exact filtering](https://support.greenhouse.io/hc/en-us/articles/27104809835291-Talent-Filtering)
- [Greenhouse AI matching](https://support.greenhouse.io/hc/en-us/articles/41396009937307-Talent-Matching)
- [Greenhouse application rules](https://support.greenhouse.io/hc/en-us/articles/203105595-Application-rules-overview)
- [Greenhouse parse failures](https://support.greenhouse.io/hc/en-us/articles/200989175-Unsuccessful-resume-parse)
- [Lever parsing](https://help.lever.co/hc/en-us/articles/20087345054749-Understanding-resume-parsing)
- [Workday Skills Match](https://doc.workday.com/admin-guide/en-us/human-capital-management/recruiting/candidates/candidate-skills-match/ave1604091571278.html)
- [Workday Fit & Gap](https://doc.workday.com/hiredscore/en-us/workday-hiredscore/recruiter-productivity-/concept--fit---gap.html)

## Implemented scoring rules

AI extracts atomic requirements and supporting quotes instead of authoring category scores. Code verifies job quotes and resume quotes against the supplied text (PDFs use AI-transcribed text, not independently verified OCR). Unsupported positive evidence becomes unclear. Duplicate criteria earn no additional credit.

Required criteria weight 2; preferred criteria weight 1. Met earns full credit, partial half, missing/unclear zero documented-evidence credit. A zero is not proof the candidate lacks the qualification. Categories with no verified criteria show insufficient evidence and conservatively contribute zero; this limitation is visible. Overall weights remain hard skills 30, role alignment 15, experience 15, eligibility 15, responsibilities 10, formatting 10, impact 5. Score thresholds remain 80/60; unresolved explicit eligibility prevents a ready verdict.

Keyword counts are code-computed, whole-term and case-insensitive. They describe literal retrieval only, not competence; repetition does not add score credit. Related terminology can be credited through evidence interpretation, not substring matching.

Recommendations require a verified original quote and a supporting evidence quote. Numerical claims absent from those quotes are rejected. Faithfulness of nonnumeric facts remains model-assisted, not a formal guarantee. Official titles and unsupported tools must not change.

Gap answers are user-authored facts explicitly added to the editable draft before scoring; simply answering does not change the score. Live keyword coverage is provisional and distinct from the overall score. Full re-analysis creates an independent report, displays before/after scores and retains the same job text. AI extraction and criterion selection can vary across scans; comparisons disclose this limitation. Sources are retained only in the submitting tab, not in shareable report data.

## Validation and remaining limits

Automated tests verify quote checks, weights, partial credit, duplication resistance, term boundaries and unsupported numerical edits. A synthetic real scan and answer→draft→re-score flow is also exercised.

No matched competitor benchmark or independently annotated held-out evaluation was performed. Therefore GetSeen cannot claim best-in-market accuracy. PDF transcription, nonnumeric recommendation fidelity, date arithmetic, alias interpretation, negation and criterion consistency remain AI-dependent. Unknown evidence and original file layout require human review.

Before making superiority claims: freeze a rubric; annotate consented/synthetic resume–job pairs with independent reviewers; measure evidence precision/recall, unsupported edits, repeatability and abstention; test overlapping dates, negation, aliases, repetition, layout and instruction injection; compare identical held-out inputs against competitor tools and report confidence intervals.
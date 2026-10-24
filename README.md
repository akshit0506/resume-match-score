# GetSeen

**Evidence-based resume matching and application preparation.**

GetSeen compares your resume with a specific job description, explains the evidence behind your match score, and helps you improve your application without inventing experience. Scans work without an account; signing in adds saved scan history.

> The score is a preparation aid—not an employer’s ATS score, a hiring decision, or a probability of getting an interview. Employer screening rules vary.

## How to use GetSeen

1. **Upload your resume:** use PDF, DOCX, or plain text, up to 10 MiB. Convert legacy `.doc` files to DOCX first.
2. **Add the job description:** paste the text, upload a document, or enter an accessible job-posting URL. If a website requires login or blocks access, paste the description instead. Text inputs must contain 40–30,000 characters.
3. **Run the analysis:** review the overall score, category breakdown, supporting evidence, keywords, and unresolved requirements.
4. **Improve the draft:** review suggested edits and answer gap questions only when you have relevant experience. Answers are added to your editable draft; they do not automatically raise the score.
5. **Re-analyze:** live editing updates literal keyword coverage only. Request a full analysis to create a new report and compare before/after scores against the same job.
6. **Prepare your application:** try the six-second recruiter review, generate editable cover-letter and LinkedIn drafts, and practice interview questions. Review everything before copying or downloading the available text drafts.

Keep the submitting tab open to continue editing. Opening a report link elsewhere does not restore the full source documents or application drafts.

## Tools

| Tool | Result |
| --- | --- |
| Match report | Weighted score, category explanations, and quoted evidence. |
| Evidence ledger | Requirements marked met, partial, missing, or unclear. |
| Resume workshop | Suggested edits, gap questions, editable text, and keyword coverage. |
| Before/after comparison | A fresh analysis of your revised draft against the same job. |
| Recruiter review | A timed first-impression exercise based on report evidence—not a predicted recruiter decision. |
| Application kit | Cover-letter and LinkedIn drafts, interview talking points, practice answers, and questions for the interviewer. |

## Understanding the score

AI extracts requirements and supporting quotes. Application code validates the quotes, calculates category scores, and combines them into the overall score.

| Category | Weight |
| --- | ---: |
| Hard skills and keywords | 30% |
| Role/title alignment | 15% |
| Experience | 15% |
| Must-have requirements / eligibility | 15% |
| Soft skills / responsibilities | 10% |
| Formatting | 10% |
| Impact | 5% |

- **80–100:** ready to submit, unless an unresolved must-have blocks that verdict.
- **60–79:** needs tweaks.
- **Below 60:** not a fit yet based on documented evidence.

Missing evidence is not proof that you lack a qualification. Keyword repetition does not earn extra score credit. AI extraction can vary between scans; PDF transcription is not independently verified OCR. Check the original document and the report before applying.

See the [scoring methodology and research](docs/scoring-research.md) for rules, sources, and limitations. Comparative accuracy has not been independently established.

## Privacy and sharing

- Resume and job content are sent to the configured AI service for analysis. Upload only information you are comfortable processing this way.
- Full resume and job source text stay in the submitting tab’s session storage for editing; they are not included in stored shareable report JSON.
- Application drafts and interview practice notes also stay in that tab’s session storage, not in shared reports.
- Reports are stored by the server. Anyone with a report link can read its quoted evidence and recommendations, which may contain personal excerpts. Treat report links as sensitive.
- Signing in associates new scans with your account so you can view and delete them from history.

## Run locally

The app uses React, TypeScript, TanStack Start, Tailwind CSS, and Lovable Cloud. Install Bun, clone this repository, then run:

```sh
git clone <your-repository-url>
cd <repository-directory>
bun install
bun run dev
```

Open the local address printed by Vite. Installing dependencies alone does not configure the hosted services: analysis and saved history require Cloud configuration and server-side AI credentials. See [contributor setup](docs/development.md).

```sh
bun run test     # Scoring and factual-safety tests
bun run lint     # Source linting
bun run build    # Production build
```

## Contributing

Read [contributor setup](docs/development.md) and [architecture rules](AGENTS.md) before changing behavior. Include focused tests for scoring and evidence rules. Use synthetic or consented examples, and never commit credentials or real applicant data.

Built with [Lovable](https://lovable.dev). Git sync can keep the connected repository branch and the Lovable project in sync; preserve published history on that branch.

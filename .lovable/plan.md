# ATS Resume Score Predictor

## What it does
Upload a resume (PDF or Word) and give a job description (paste text, upload a file, or paste a job posting link). The app returns an overall ATS match score (0-100), a verdict ("Ready to submit" / "Needs tweaks" / "Not a fit yet"), a breakdown by category, and a list of specific suggested edits that keep your experience and meaning intact.

Works without an account. Signed-in users also get a saved history of past scans they can reopen.

## How the score is built (modeled on how real ATS and recruiters screen)
Real systems (Workday, Greenhouse, Lever, iCIMS, Taleo) parse the resume into fields, then rank by keyword/skill match, job title match, experience, and knock-out requirements. Tools like Jobscan mimic this. The score combines:

```text
Hard skills & keywords match   30%   (exact + synonym/acronym match, e.g. "JS" vs "JavaScript")
Job title & role alignment     15%
Experience level & years       15%
Must-have requirements         15%   (degree, certifications, clearances, location/visa)
Soft skills & responsibilities 10%
Parseability & formatting      10%   (standard headings, dates, contact info, no tables/images issues)
Impact & measurable results     5%
```
Missing must-have requirements are shown as red "knock-out risk" flags regardless of score.

## Results page
- Big score dial with verdict and a one-line summary
- Category bars with short explanations
- Keywords table: found / missing / found but only once, with how often the job mentions each
- Knock-out risks
- Formatting/parsing warnings
- Suggested edits: each shows the section, original line, suggested rewrite, and the reason (e.g. "adds missing keyword 'Kubernetes' that you already used in project X"). Suggestions only reword or surface existing experience, never invent new work.
- Copy-to-clipboard per suggestion

## Pages
- `/` - landing + scanner (resume upload, job description tabs: Paste / Upload / Link)
- `/results/$id` - results report
- `/auth` - sign in / sign up (email + Google)
- `/history` - signed-in users' past scans

## Design
Clean, editorial "report card" feel: warm off-white background, deep ink text, a single confident accent (amber), serif headings with a sans body. No purple gradients.

## Technical details
- Lovable Cloud: auth (email + Google), `scans` table (user_id nullable, job title, company, score, full JSON report, created_at) with RLS so owners only see their own; anonymous scans stored with a random id and readable via link only through a server function.
- Resume parsing server-side: PDF sent directly to the AI model as a file input; DOCX text extracted with `mammoth`; also run local checks (contact info, standard section headings, dates) for the parseability score.
- Job link: fetched via the Firecrawl connector (scrape to markdown); falls back to asking the user to paste if the site blocks it.
- Scoring: one `createServerFn` calling Lovable AI (default model) with a strict JSON schema output for category scores, keywords, knock-outs, and suggestions; weighted total computed in code (not by the model) so it is consistent. Unit tests cover the weighting and verdict thresholds (80+ ready, 60-79 tweaks, under 60 not yet).
- Rate/size limits: files up to 10MB, text up to ~30k chars.

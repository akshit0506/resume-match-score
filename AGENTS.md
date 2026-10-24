<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Contributor architecture rules
- AI extracts quoted criteria; src/lib/evidence.ts validates quotes and computes category scores, and src/lib/scoring.ts computes the weighted overall score, so scoring rules remain testable rather than model-authored.
- Word files are converted to text in the browser; PDFs are sent to the AI as file inputs (server runtime is workerd, avoid Node-only parsers).
- Scans are written only by the server function (service role); anonymous reports are readable by unguessable id via getScan, owners list theirs via RLS.
- Job links are fetched directly server-side (JSON-LD JobPosting first, HTML fallback), so accessible postings do not require a separate scraping service.
- Resume and job source text are returned only to the submitting caller and retained in that tab's sessionStorage, never persisted in shareable report JSON, so report links cannot reveal full source documents.
- Live editing displays exact keyword coverage only; full score updates require explicit server re-analysis, so provisional text matching is never presented as a validated ATS score.
- Application kits are generated on explicit request from the current resume draft and original job text, validated for supporting quotes, and stored only in tab sessionStorage; shared reports never expose kit drafts or practice notes.
- Recruiter highlights use existing verified report criteria without another AI call; the six-second timer is a review exercise, not a predicted recruiter decision.

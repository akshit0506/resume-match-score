# Developing GetSeen

## Setup

GetSeen uses React, TypeScript, TanStack Start, and Tailwind CSS. Lovable Cloud provides authentication and report persistence. AI requests run on the server through the configured Lovable AI gateway.

Install Bun, clone the repository, and run:

```sh
bun install
bun run dev
```

Use the local address printed by Vite. Run `bun run test` for automated tests, `bun run lint` for lint checks, and `bun run build` for the production build.

## Hosted-service configuration

This is application source, not a standalone offline parser. A clone needs its own authorized service configuration to analyze resumes, generate application kits, or save reports.

- Configure Lovable Cloud database and authentication access for the deployment.
- Apply application schema migrations to the intended backend; Git sync alone does not apply migrations.
- Supply `LOVABLE_API_KEY` through server-side secret management, never browser configuration.
- Configure enabled sign-in providers and same-origin OAuth redirects.
- Preserve generated integration files; do not replace them with hardcoded credentials.

Do not copy another deployment’s private configuration or commit `.env` files. Hosting outside Lovable requires compatible service configuration and a server runtime; it is not a one-command static-site deployment. No private credential values are included in this guide.

## Code map

| Location | Responsibility |
| --- | --- |
| `src/routes/` | Scanner, reports, sign-in, history, and shared layout. |
| `src/components/ResumeWorkshop.tsx` | Draft editing, gap questions, and re-analysis. |
| `src/components/RecruiterView.tsx` | Report-backed first-impression exercise. |
| `src/components/ApplicationKit.tsx` | Application drafts and interview practice. |
| `src/lib/ats.functions.ts` | Server-side analysis, report retrieval, and job-link fetching. |
| `src/lib/evidence.ts` | Quote validation, evidence scoring, safe suggestions, and keyword counts. |
| `src/lib/scoring.ts` | Overall weights and verdict logic. |
| `src/lib/application-kit.ts` | Application-kit schema and factual safeguards. |
| `src/lib/application.functions.ts` | Explicit server-side application-kit generation. |
| `src/lib/editor-session.ts` | Tab-scoped source-document storage. |
| `docs/scoring-research.md` | Methodology, primary sources, and limitations. |

## Contribution checklist

- Keep scoring calculations in testable code rather than model-authored scores.
- Add focused tests when changing weights, verdicts, evidence validation, or factual safeguards.
- Never invent employment, skills, metrics, or qualifications in recommendations.
- Keep full source documents, application drafts, and practice notes out of shareable reports.
- Test the scan → edit → re-analysis flow when changing the workshop.
- Use synthetic or explicitly consented resume–job pairs. Redact personal content in bug reports.
- Keep server code compatible with the deployed worker environment, not just local Node.js.
- Read [AGENTS.md](../AGENTS.md) and [route conventions](../src/routes/README.md) before structural changes.

## Reporting problems

Include the affected screen, reproduction steps, expected behavior, and a redacted screenshot or synthetic example. Do not include private report links, real resumes, session tokens, or API keys. For scoring issues, identify the requirement and evidence you expected to be credited.
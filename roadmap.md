# GetSeen roadmap

Usage, features, and setup are documented in [README.md](README.md). Scoring limitations and proposed evaluation work are documented in [the methodology](docs/scoring-research.md).

## Repository readiness
- [x] Provide user-facing usage, privacy, scoring, and contributor documentation.
- [ ] Complete GitHub sync authorization in Lovable Project settings → Git (requires the repository owner's authorization).

## Results loading
- [x] Remove repeated partial JSON processing and verify a multi-page PDF scan and saved report refresh (hosted verification requires publishing the update).
- [x] Remove AI stream replay retention and verify a new scan opens its report.
- [x] Verify report loading and retry states on desktop and mobile.
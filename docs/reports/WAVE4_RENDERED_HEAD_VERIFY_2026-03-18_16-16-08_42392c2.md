# Wave 4 Rendered Head + Trust Verification Harness

Generated: 2026-03-18T15:16:08.496Z
Commit: `42392c2`
Artifact root: `docs/reports/artifacts/wave4-rendered-head-2026-03-18_16-16-08-42392c2`
Summary JSON: `docs/reports/artifacts/wave4-rendered-head-2026-03-18_16-16-08-42392c2/summary.json`

## Targets
- `prod` -> https://smartprintai.com (routes: 12, failures: 0)

## Trust Visibility States
### prod
- `/create`: trust=visible (expected required, markers 3/3)
- `/en/create`: trust=visible (expected required, markers 3/3)
- `/fr/create`: trust=visible (expected required, markers 3/3)
- `/de/create`: trust=visible (expected required, markers 3/3)
- `/es/create`: trust=visible (expected required, markers 3/3)
- `/products`: trust=visible (expected required, markers 3/3)
- `/blog`: trust=missing (expected absent, markers 0/3)
- `/en/blog`: trust=missing (expected absent, markers 0/3)
- `/fr/blog`: trust=missing (expected absent, markers 0/3)
- `/de/blog`: trust=missing (expected absent, markers 0/3)
- `/es/blog`: trust=missing (expected absent, markers 0/3)
- `/products/cmmhtq4e4000343l29gzhn3ca`: trust=visible (expected required, markers 3/3)

## Result
- PASS: canonical/hreflang/x-default/og:url and trust visibility assertions passed for all configured targets/routes.

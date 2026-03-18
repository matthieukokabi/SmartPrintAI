# Wave 5 Rendered Head + Semantic Verification Harness

Generated: 2026-03-18T19:35:25.399Z
Commit: `99e8498`
Artifact root: `docs/reports/artifacts/wave5-rendered-semantics-2026-03-18_19-35-24-99e8498`
Summary JSON: `docs/reports/artifacts/wave5-rendered-semantics-2026-03-18_19-35-24-99e8498/summary.json`

## Targets
- `prod` -> https://smartprintai.com (routes: 16, failures: 0)

## Trust Visibility States
### prod
- `/create`: state=required:ssr-visible (expected required, markers 3/3)
- `/en/create`: state=required:ssr-visible (expected required, markers 3/3)
- `/fr/create`: state=required:ssr-visible (expected required, markers 3/3)
- `/de/create`: state=required:ssr-visible (expected required, markers 3/3)
- `/es/create`: state=required:ssr-visible (expected required, markers 3/3)
- `/products`: state=required:ssr-visible (expected required, markers 3/3)
- `/en/products`: state=required:ssr-visible (expected required, markers 3/3)
- `/fr/products`: state=required:ssr-visible (expected required, markers 3/3)
- `/de/products`: state=required:ssr-visible (expected required, markers 3/3)
- `/es/products`: state=required:ssr-visible (expected required, markers 3/3)
- `/blog`: state=absent:ssr-clean (expected absent, markers 0/3)
- `/en/blog`: state=absent:ssr-clean (expected absent, markers 0/3)
- `/fr/blog`: state=absent:ssr-clean (expected absent, markers 0/3)
- `/de/blog`: state=absent:ssr-clean (expected absent, markers 0/3)
- `/es/blog`: state=absent:ssr-clean (expected absent, markers 0/3)
- `/products/cmmhtq4e4000343l29gzhn3ca`: state=required:ssr-visible (expected required, markers 3/3)

## Semantic Assertions
### prod
- `/create`: schema=breadcrumb (jsonLd=1, types=BreadcrumbList) ; legal=required (reachability=/support:200, /terms:200)
- `/en/create`: schema=breadcrumb (jsonLd=1, types=BreadcrumbList) ; legal=required (reachability=/support:200, /terms:200)
- `/fr/create`: schema=breadcrumb (jsonLd=1, types=BreadcrumbList) ; legal=required (reachability=/fr/support:200, /terms:200)
- `/de/create`: schema=breadcrumb (jsonLd=1, types=BreadcrumbList) ; legal=required (reachability=/de/support:200, /terms:200)
- `/es/create`: schema=breadcrumb (jsonLd=1, types=BreadcrumbList) ; legal=required (reachability=/es/support:200, /terms:200)
- `/products`: schema=itemlist+breadcrumb (jsonLd=2, types=BreadcrumbList|ItemList) ; legal=required (reachability=/support:200, /terms:200)
- `/en/products`: schema=itemlist+breadcrumb (jsonLd=2, types=BreadcrumbList|ItemList) ; legal=required (reachability=/support:200, /terms:200)
- `/fr/products`: schema=itemlist+breadcrumb (jsonLd=2, types=BreadcrumbList|ItemList) ; legal=required (reachability=/fr/support:200, /terms:200)
- `/de/products`: schema=itemlist+breadcrumb (jsonLd=2, types=BreadcrumbList|ItemList) ; legal=required (reachability=/de/support:200, /terms:200)
- `/es/products`: schema=itemlist+breadcrumb (jsonLd=2, types=BreadcrumbList|ItemList) ; legal=required (reachability=/es/support:200, /terms:200)
- `/blog`: schema=none (jsonLd=2, types=BreadcrumbList|ItemList) ; legal=absent (reachability=/support:n/a, /terms:n/a)
- `/en/blog`: schema=none (jsonLd=2, types=BreadcrumbList|ItemList) ; legal=absent (reachability=/support:n/a, /terms:n/a)
- `/fr/blog`: schema=none (jsonLd=2, types=BreadcrumbList|ItemList) ; legal=absent (reachability=/fr/support:n/a, /terms:n/a)
- `/de/blog`: schema=none (jsonLd=2, types=BreadcrumbList|ItemList) ; legal=absent (reachability=/de/support:n/a, /terms:n/a)
- `/es/blog`: schema=none (jsonLd=2, types=BreadcrumbList|ItemList) ; legal=absent (reachability=/es/support:n/a, /terms:n/a)
- `/products/cmmhtq4e4000343l29gzhn3ca`: schema=product+breadcrumb (jsonLd=2, types=BreadcrumbList|Product) ; legal=required (reachability=/support:200, /terms:200)

## Result
- PASS: canonical/hreflang/x-default/og:url parity, trust visibility state, money-page schema shape, and legal/support link integrity assertions passed.

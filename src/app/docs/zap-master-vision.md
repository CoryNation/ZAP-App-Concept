# ZAP App — Master Vision & Guardrails

## North Star
- Drawer navigation (Material Design) + top AppBar with Factory/Line/Time.
- Information Architecture:
  - / (Home)
  - /operations/{line-speed,downtime,quality,greasy-twin}
  - /requests
  - /improvement/concepts
  - /recognition/wins
  - /admin, /settings

## Patterns & Guardrails
- TypeScript strict; MUI; primary #b51e27; rounded cards.
- No DB calls in React components → use src/lib/services/*.
- Synthetic data fallbacks if Supabase tables are missing.
- Preserve existing pages (Work Requests, Greasy Twin). Use redirects from old routes.

## Global Acceptance
- Drawer works (desktop permanent, mobile temporary) and highlights active route.
- AppBar selectors persist; Home shows AI Insight & Scope cards.
- Line Speed chart: multi-series ft/min with **red 700 ft/min** goal; renders without DB.
- Requests & Greasy Twin work under new routes.
- Concepts & Wins pages exist with basic add/list and fallback storage.

## Commit Plan (high level)
1) Shell (AppShell + Drawer + AppBar)  
2) Route migration + redirects  
3) Home polish (Insight + Scope)  
4) Line Speed chart (Recharts + 700 goal + fallback)  
5) Concepts & Wins scaffolds  
6) README + docs

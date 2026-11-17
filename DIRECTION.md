# Direction: WiFi Access Manager (access_point_repo)

A web app for finding, rating and sharing WiFi access points on a map. It shares passwords
within organizations, imports networks from WiGLE, generates QR codes, and records speed tests
and blocked-service reports.

Status: dormant (last change 2025-09-19). Built in one day (23 commits).

## Where it is heading
- A map-first discovery UI (Leaflet) with WiGLE search and import (486a47f, baae9da, 2fa5207).
- Community data per access point: ratings, speed tests, and service-restriction toggles
  (d7e6d49, fb2994b).
- Docker Compose deployment, with a basic GitHub Actions pipeline (b0b7918, ROADMAP.md).

## Priorities
1. Security and data hygiene review (tracked privately).
2. Add tests. The roadmap says "Ready for Jest/Vitest implementation" and there are none
   (ROADMAP.md).
3. Replace the mock speed test (ROADMAP.md "Known Issues").
4. Mobile responsiveness and WCAG 2.1 AA (ROADMAP.md "Future Enhancements").

## Non-goals and constraints
- Node/Express/TypeScript, PostgreSQL with PostGIS, Redis, React + Vite, Docker (ROADMAP.md).
- Twelve-factor; WiGLE credentials come only from the environment (ROADMAP.md,
  backend/src/routes/wigle.ts).

## Decisions
- 2025-09-19: Upsert instead of failing on duplicate access points (24ca12a, 4ea5e84).
- 2025-09-19: Speed test mocked on Apple Silicon (31b55fa).

## Open questions for the owner
1. Is this still wanted? ROADMAP.md calls it "production-ready", but it has no tests
   and a mock speed test.

## Related documents
- ROADMAP.md, wifi-access-manager/README.md. LessonsLearned.md is empty.
- To resume: priorities 1–2 before any deployment.

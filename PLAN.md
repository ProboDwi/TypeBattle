# Keylane implementation plan

Keylane uses Next.js App Router on Vercel and Supabase for PostgreSQL, Auth, and Realtime. Browser code only receives the project URL and publishable key. Privileged writes, scoring, rating changes, achievements, placements, role changes, and moderation run through authenticated Route Handlers and security-definer PostgreSQL functions.

## Architecture decisions

- **Rendering:** Server Components load public or user-specific summaries; Client Components are limited to forms, typing input, realtime, and interactive controls.
- **Authentication:** `@supabase/ssr` stores the Supabase session in cookies. `proxy.ts` refreshes tokens; every protected page and mutation also verifies the user server-side.
- **Authoritative results:** the browser sends raw counters and integrity signals. PostgreSQL functions recompute official timing, WPM, accuracy, placement, rating, XP, streaks, and achievements transactionally.
- **Realtime:** private `race:{roomId}` channels use Presence for connection state and Broadcast for throttled progress/events. Database rows remain the durable source of truth.
- **Rate limiting:** a database-backed sliding window is used by server routes, which remains safe across Vercel instances.
- **Daily challenge:** Asia/Jakarta is the canonical product timezone. The first official completed result of the day is retained; later attempts are practice-only.
- **Level formula:** XP needed to reach level `n` is `100 × (n - 1)²`. All level displays use the shared experience utility.
- **Rating:** deterministic pairwise Elo with K=24, summed across opponents and capped at ±40 per race.
- **Guest practice:** guest results stay on the device and never enter the database or leaderboards.

## Delivery phases

1. Foundation, visual system, public pages, configuration, and Supabase clients.
2. Database schema, constraints, RLS, secure functions, seed, authentication, and route protection.
3. Typing engine, practice lifecycle, results, dashboard, profile, settings, and history.
4. Private rooms, lobby, Presence, host controls, synchronized countdown, realtime race, and results.
5. Matchmaking, leaderboards, daily challenge, XP, achievements, and admin tools.
6. Security/accessibility review, unit/integration/E2E coverage, build validation, and deployment documentation.

## Implementation status

All source-controlled phases are implemented. Remaining verification requiring external credentials is listed in `TODO.md`: apply SQL to a real Supabase project, verify email redirects, run the two-account Realtime smoke test, and deploy to Vercel.

# Keylane delivery checklist

- [x] Initialize Next.js, TypeScript strict mode, Tailwind, ESLint, and npm scripts.
- [x] Establish the Keylane visual system, responsive public shell, metadata, favicon, and landing page.
- [x] Add environment validation and Supabase browser/server/admin clients.
- [ ] Apply the Supabase migration and seed to a configured project.
- [ ] Verify email confirmation and password reset against configured Supabase redirect URLs.
- [ ] Run two-account realtime smoke tests against a configured Supabase project.
- [ ] Assign the first admin through the documented SQL command and smoke-test admin mutations.
- [ ] Run the production smoke-test checklist after the first Vercel deployment.

Implementation items that do not require external credentials are covered by source and tests. The remaining items above require a real Supabase or Vercel environment.

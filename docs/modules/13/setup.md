# Database, sessions and deployment

## Dedicated resources

Use a NEW Supabase project and NEW Vercel project for `PenielOkoli/tasklane-connected`. Do not attach an older Tasklane database or replace a historical deployment. The dedicated Supabase database is provisioned and connected to Production. The initial migration is applied. Supabase Auth Site URL is https://tasklane-connected-site.vercel.app and email confirmation remains enabled. Do not reapply the initial migration to the existing database.

1. Provision the dedicated Supabase database on a free plan, subject to availability. Apply `supabase/migrations/001_connected.sql` once through its SQL editor or migration tooling.
2. Enable Supabase email/password Auth. Keep email confirmation enabled. Set the Auth site URL to the new production deployment. Configure email delivery if the provider's default mail service does not permit external recipients.
3. In the new Vercel project set sensitive Production variables: `SUPABASE_URL`, `SUPABASE_ANON_KEY` (legacy anon key), `SUPABASE_SERVICE_ROLE_KEY` (legacy service-role key), `SESSION_SECRET` (new random secret at least 32 characters), and `GROQ_API_KEY`. Optional `GROQ_MODEL` defaults to `openai/gpt-oss-120b`. Never expose the service key with a NEXT_PUBLIC prefix. Never commit credentials or paste them into chat. Integration-generated variable names may need mapping to these exact names.
4. Import the new GitHub repository into Vercel, Next.js preset, root `./`, Node 22. Each push should trigger a deployment. Preview environments require their own test database and credentials; do not share production credentials with untrusted previews.
5. Create and confirm the intended administrator's account. In Supabase, insert ONLY that verified Auth user UUID into `public.workspace_admins`. Example (replace placeholder in provider console): `insert into public.workspace_admins(user_id) values ('VERIFIED-ADMIN-USER-UUID');`. There is no public admin registration path.
6. Verify real sign-in, save, refresh, sign-out/sign-in and second-account isolation. Submit unhelpful/flagged feedback, then resolve it as the administrator. Verify the review is visible after the owner reloads and the event exists in `review_events`.

## Session design

Supabase verifies email/password and access tokens. The server calls Auth `/user` on every protected request instead of trusting a decoded JWT. The access token is in an HttpOnly, SameSite=Strict cookie, Secure in production, expiring after at most one hour. Refresh tokens are deliberately not retained. After expiry the user signs in again; database data remains. Logout clears the cookie and asks Auth to revoke the session. Already issued access JWTs may remain valid until expiry; the app does not claim immediate stolen-token revocation.

## Persistence and authorization

`conversations` stores each question/answer exchange, citations, feedback and review state, tied to `auth.users.id`. This module does not implement multi-turn model memory. History is paginated. UUID request IDs prevent duplicate saved records on retry. Concurrent requests can still incur duplicate model work before the unique constraint resolves the race.

All database writes use a server-only service key. Every owner query includes the verified user UUID, and update predicates include the expected version. Service keys bypass RLS, so explicit route ownership checks are essential and covered by route tests. RLS also allows authenticated direct reads only of the owner's conversations; direct writes and admin membership access are revoked. Admin routes check membership server-side. The SQL review function checks membership again and atomically updates the conversation and appends an audit event. Stale changes return conflict instead of overwriting a newer review.

Feedback reopens a resolved review; prior review events remain in the audit table. The UI never presents browser localStorage or sample data as the persisted history. Retrieved project documents are still explicitly fictional. The inherited demonstration routes remain separate from the new `/` account workspace and do not satisfy this module's persistence evidence.

## Verification commands

- `npm run typecheck`
- `npm test` (inherited regression suite)
- `npm run test:integration` (real route handlers, simulated Supabase HTTP transport; no real database)
- `npm run build`
- `npm run test:live` (dedicated live database, three distinct confirmed test accounts, admin membership provisioned)

Live test environment names: TEST_BASE_URL, TEST_OWNER_EMAIL, TEST_OWNER_PASSWORD, TEST_OTHER_EMAIL, TEST_OTHER_PASSWORD, TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD. Supply these securely through process/CI environment; no credential files in source. The test makes no paid model call, leaves a clearly labeled audit record, and verifies persistence after a fresh login. A separate consented live AI request is still needed to verify Groq integration.

Limitations: inherited rate limits are process-local, not a distributed quota; password reset UI and account deletion UI are not implemented; production backup/retention policies need provider configuration. Review notes resolve an item but do not rewrite generated answers.


# Module 13 implementation plan

Continue Tasklane in a separate Tasklane Connected repository and Vercel project. Source starts from the local Module 12 feature checkout; this does not merge or imply approval of its pending PR. Historical deployments remain untouched. Tasklane continuity follows the user's earlier product correction rather than the original Module 1 product.

1. Add Supabase Auth email/password sign-in with HttpOnly access cookies. Sessions expire after one hour; signing in again retrieves the same account's database history. No browser token storage.
2. Persist question/answer conversations and feedback in PostgreSQL. Save answers only after generation; show success only after the database confirms insertion. Unique request IDs protect retries from duplicate records.
3. Scope all account reads and writes to the verified Auth user. Enable RLS. Keep service credentials server-only. Reject cross-origin writes and bound payloads.
4. Add server-authorized admin queue for flagged or low-quality answers. Review changes and audit events commit atomically, with optimistic concurrency protection.
5. Build a responsive account workspace, source evidence, history, feedback and admin review UI.
6. Run regression/type/build checks and integration coverage. Run real database/live tests after provisioning. Record pending verification honestly.

Acceptance: signing out and back in restores saved conversations and feedback; another account cannot access them; non-admin review requests fail; admins review persisted flagged data; failed saves do not appear successful; live deployment uses its own database and sensitive environment variables.

Provisioning dependency: Vercel's Supabase installation requires account-owner acceptance of provider terms. No live persistence claim until the database is provisioned, migration applied and end-to-end checks pass.

# Tasklane Connected

Module 13: Full-Stack AI Feature Integration. A separate Tasklane project with account-based question/answer history, persistent feedback and administrator review.

Repository: https://github.com/PenielOkoli/tasklane-connected

Live Vercel URL: https://tasklane-connected-site.vercel.app

**Status: live Groq answer generation, saved account history, administrator access and persisted admin review were verified on 22 November 2026. The three-account live integration runner and direct-role RLS checks remain pending.**

## What is implemented

- Next.js route handlers for verified Supabase Auth accounts, conversations, feedback and admin review.
- PostgreSQL schema with user ownership, RLS, optimistic updates, request IDs and atomic review audit events.
- Responsive account workspace with saved answers, source inspection, feedback and a protected admin queue.
- 71 inherited regression tests and three route integration tests passing. The new integration tests simulate Supabase; the separate live runner requires three confirmed test accounts.

## Live verification

- A consented Groq request returned an answered result with citations to the fictional sample passages `brief-2` and `quality-2`. The conversation remained in the signed-in account history after a full page reload.
- The requested confirmed Auth account was added to `public.workspace_admins`. The admin queue showed the flagged conversation, and resolving it saved a review note and audit event.
- After a full reload, the conversation remained resolved. A read-only SQL check confirmed the review record, note and matching `review_events` row persisted.
- Vercel redeployed production commit `c5018f58a193c20451bcf55abb14e0f7b87d9299` and reported Ready. See [deployment](https://vercel.com/penielokolis-projects/tasklane-connected-site/FhXoeyQVM6yvCyT2uJXZ4iTxfaoY).

The review note is explicitly labeled as an integration verification, not a learner-authored evaluation. The sample project sources are fictional.

## Run and deploy

Use Node 22 and `npm ci`. Configure the server environment securely as described in [setup](docs/modules/13/setup.md), then run `npm run dev`.

Commands: `npm run typecheck`, `npm test`, `npm run test:integration`, `npm run build`, `npm run test:live`.

[Implementation plan](docs/modules/13/plan.md) | [Database and session setup](docs/modules/13/setup.md) | [Verification and pending checks](docs/modules/13/verification.md) | [SQL migration](supabase/migrations/001_connected.sql)

## Continuity

This continues the user-selected Tasklane product in its own repository and Vercel project. It starts from the local Module 12 feature checkout; that module's draft PR remains separate and unmerged. Earlier submitted projects and deployments are not modified. Account activity is stored only when the new backend is configured and confirms the save.

The new account workflow is at `/`. Historical demonstration routes are retained as reference code and are not evidence of this module's durable persistence. Sessions last at most one hour; sign in again to retrieve the same account history. This implementation saves individual question/answer conversations, not multi-turn model memory.

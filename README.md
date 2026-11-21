# Tasklane Connected

Module 13: Full-Stack AI Feature Integration. A separate Tasklane project with account-based question/answer history, persistent feedback and administrator review.

Repository: https://github.com/PenielOkoli/tasklane-connected

**Status: implementation prepared; database provisioning and live deployment verification are pending. No live Vercel URL is claimed yet.**

## What is implemented

- Next.js route handlers for verified Supabase Auth accounts, conversations, feedback and admin review.
- PostgreSQL schema with user ownership, RLS, optimistic updates, request IDs and atomic review audit events.
- Responsive account workspace with saved answers, source inspection, feedback and a protected admin queue.
- 71 inherited regression tests and three route integration tests passing. The new integration tests simulate Supabase; a separate runner verifies a real deployment after setup.

## Run and deploy

Use Node 22 and `npm ci`. Configure the server environment securely as described in [setup](docs/modules/13/setup.md), then run `npm run dev`.

Commands: `npm run typecheck`, `npm test`, `npm run test:integration`, `npm run build`, `npm run test:live`.

[Implementation plan](docs/modules/13/plan.md) | [Database and session setup](docs/modules/13/setup.md) | [Verification and pending checks](docs/modules/13/verification.md) | [SQL migration](supabase/migrations/001_connected.sql)

## Continuity

This continues the user-selected Tasklane product in its own repository and Vercel project. It starts from the local Module 12 feature checkout; that module's draft PR remains separate and unmerged. Earlier submitted projects and deployments are not modified. The source documents are fictional project examples. Account activity is stored only when the new backend is configured and confirms the save.

The new account workflow is at `/`. Historical demonstration routes are retained as reference code and are not evidence of this module's durable persistence. Sessions last at most one hour; sign in again to retrieve the same account history. This implementation saves individual question/answer conversations, not multi-turn model memory.

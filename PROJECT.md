# Project: LMS Subscription Remediation Fixes

## Architecture & Code Layout
- Next.js App Router (TypeScript, Tailwind, Supabase/Prisma/Postgres)
- Key paths:
  - `lib/subscription-validation.ts`: Subscription validation logic (restore from git / implement correctly)
  - `app/admin/subscriptions/actions.ts`: Admin subscription actions & snapshot creation
  - `app/student/subscriptions/actions.ts`: Student subscription actions, snapshot creation, fetching active/ended subscriptions
  - `app/api/media/[...key]/route.ts`: Media streaming endpoint (security & entitlement)
  - `app/api/attachments/[...key]/route.ts`: Attachment downloading endpoint (security & entitlement)
  - `app/student/exams/actions.ts`: Student exam access control logic
  - `app/api/cron/...`: Subscription expiry & grace period cron jobs
  - `components/...` & UI files: `subscriptions_only` mode enforcement (hiding buy buttons, cart buttons)

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | R1: Restore `lib/subscription-validation.ts` | Find in git history, restore/update to resolve TS build blocker in actions | M1 | Request |
| 2 | R2: Secure `/api/media/[...key]` & `/api/attachments/[...key]` | Auth & entitlement checks for media and attachment access | M2 | Request |
| 3 | R2: Fix student exam access logic | Restrict exams without stage/branch from being opened to all students improperly | M2 | Request |
| 4 | R3: Update `plan_snapshot` generation | Store price, scope type, and all actual scopes at purchase/assignment time | M3 | Request |
| 5 | R3: Fix `subscriptions_only` mode UI | Hide buy buttons, cart access when mode is active | M3 | Request |
| 6 | R4: Graceful `CRON_SECRET` & Grace Period logic | Handle cron secret in local builds, fix default grace period query, display ended/expired in student UI | M4 | Request |
| 7 | Verification & Automated Test Scripts | Node verification script for media 401/403, exam access test, snapshot DB test, UI mode verification | M5 | Request |

## Milestones & Execution Plan
| # | Name | Scope | Agent Assigned | Status |
|---|------|-------|----------------|--------|
| 1 | Exploration & Blueprint | Map all code locations, inspect git history for validation file, detail exact changes needed | Explorer (Agent 1) | IN_PROGRESS |
| 2 | Implementation & Scripting | Implement R1-R4 code fixes and create programmatic test scripts | Worker (Agent 2) | PLANNED |
| 3 | Review & Build Verification | Run `npx tsc --noEmit`, `npm run build`, run test scripts, audit code | Reviewer (Agent 3) | PLANNED |

## 2026-08-24T14:39:38Z

You are the Project Orchestrator. Your working directory is `d:\Workspace\LMS\.agents\orchestrator`.
Please read the original user request at `d:\Workspace\LMS\.agents\ORIGINAL_REQUEST.md`.

## Request Summary & Scope
The user requests a single set of related fixes using a small focused team (3 agents) to fix remaining critical and major functional gaps identified in the SUBSCRIPTION_REMEDIATION_PLAN audit for the LMS project at `d:\Workspace\LMS`.

Requirements to satisfy:
1. **R1. Fix TypeScript Build Blocker**:
   - Restore missing `lib/subscription-validation.ts` by searching git history for the nearest commit where it existed. Ensure it is correct, updated if needed, and resolves import errors in `app/admin/subscriptions/actions.ts` and `app/student/subscriptions/actions.ts`.
2. **R2. Fix Security and Access Issues**:
   - Secure `/api/media/[...key]` and `/api/attachments/[...key]` to require proper authentication and entitlement checks.
   - Fix logic in `app/student/exams/actions.ts` so exams without a specific stage/branch are not incorrectly opened to any student.
3. **R3. Address Functional Gaps**:
   - Update `plan_snapshot` generation to include price, scope type, and all actual scopes at the time of purchase/assignment.
   - Fix `subscriptions_only` mode UI to correctly hide buy buttons and cart access when active.
4. **R4. Fix Operational and Cron Issues**:
   - Ensure `CRON_SECRET` is properly configured or handled gracefully for local builds.
   - Fix cron job to correctly identify subscriptions relying on the platform's default grace period.
   - Ensure student UI fetches and displays `ended`/`expired` subscriptions rather than hiding them.

Acceptance Criteria:
- `npx tsc --noEmit` completes without errors.
- `npm run build` succeeds.
- Programmatic Verification: Write a Node.js verification script to test direct access to `/api/media/...` without valid session/subscription asserting 401/403.
- Programmatic Verification: Write a script or automated test demonstrating exams are correctly restricted according to the new access logic.
- Functionality: Verify `plan_snapshot` in the DB contains `price` and `scopes` arrays after an update.
- Functionality: Verify in `subscriptions_only` mode, students cannot add items to cart or checkout.

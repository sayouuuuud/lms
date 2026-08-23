# Subscription System — Comprehensive Remediation & Completion Plan

**Project:** LMS Platform — Subscription Management System
**Branch:** `subscription-management-system`
**Goal:** Close all security holes, fix logic inconsistencies, complete the commercial funnel, and bring the subscription system to a production-ready standard — all while preserving the existing (well-designed) core engine: `subscription-manager.ts`, `subscription-access.ts`, `lecture-access.ts`, and the Prisma schema.

**Guiding principles:**

- The core access engine is correct — do NOT rewrite it. All fixes route *through* it.
- Reuse existing proven patterns (the `orders` receipt → pending → admin approval flow) instead of inventing new ones.
- Every state change goes through `subscription_events` for auditability.
- Fix order: Security → Logic correctness → Commercial funnel → UX/Display → Hardening & polish.

---

## Milestone 0 — Emergency Security Patch (do first, smallest possible diff)

**Objective:** Eliminate the unauthenticated admin action and leaked credentials. Nothing else ships before this.

### 0.1 Neutralize `app/admin/subscriptions/assign/actions.ts`

- Add `requireSubscriptionManager()` (same guard used in `app/admin/subscriptions/actions.ts`) as the first line of **every** exported server action in this file (`assignSubscriptionToStudent`, `searchStudents`, and any others).
- Then **deprecate the duplicate logic**: rewrite `assignSubscriptionToStudent` to be a thin wrapper that delegates to the canonical `assignSubscription` in `lib/subscription-manager.ts`, so it inherits:
  - Overlap detection (no double-active subscription for same plan/scope)
  - `plan_snapshot` capture at assignment time
  - `subscription_events` record (`assigned` event with `actor_id`)
- `searchStudents`: guard it, and reduce the returned payload to the minimum needed by the UI (id, name, masked phone or no phone if the UI doesn't strictly need it).
- **Acceptance:** calling any action in this file without an authorized session throws/redirects; assignment via this path produces identical DB side-effects to the canonical path (snapshot + event + overlap check).

### 0.2 Credential rotation & `.env.example` sanitization

- Replace real values in `.env.example` with placeholders (`DATABASE_URL="postgresql://user:password@host/db"`, `NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"`).
- **User action required (cannot be done from code):** rotate the leaked DB password in the Neon/Postgres dashboard and generate a new `NEXTAUTH_SECRET`, then update the Vercel project env vars. The old secret must be treated as compromised regardless (it lives in git history).
- **Acceptance:** no secrets in any tracked file.

### 0.3 Middleware whitelist cleanup

- Remove `/api/webhooks` from `PUBLIC_PATHS` in `middleware.ts` (no such route exists). If webhooks are planned later, re-add it scoped to the exact route with signature verification at that time.

---

## Milestone 1 — Access-Logic Correctness (make subscriptions mean what they say)

**Objective:** Every content gate (lectures, exams, files, anything else) respects plan scopes and `subscription_mode` identically.

### 1.1 Fix exam access scope bypass (`app/student/exams/actions.ts`)

- **Current bug:** any active subscription unlocks **all** exams (lines ~75–77).
- **Fix:** resolve each exam to its content coordinates (course → term → branch → stage, and lecture linkage if exams attach to lectures) and check coverage through the same scope-matching logic used by `lecture-access.ts`.
- **Implementation approach:** extract the scope-coverage matcher from `lecture-access.ts` into a shared pure function in `lib/subscription-access.ts` (e.g. `subscriptionCoversTarget(scopes, { stageId, branchId, termId, courseId, lectureId })`) and have both lectures and exams call it. Single source of truth — no copy-paste.
- Also verify exam access honors `subscription_mode` (`purchases_only` must ignore subscriptions for exams too, matching lecture behavior).
- **Acceptance:** a plan scoped to one lecture/course unlocks only that content's exams; full audit of every other access checkpoint (files/downloads/video tokens if any) confirms they use the shared matcher.

### 1.2 Centralized access facade

- Create/confirm one entry point: `checkContentAccess(studentId, target)` in `lib` that internally handles mode resolution (`purchases_only` / `subscriptions_only` / hybrid), purchase lookup, subscription lookup with grace period, and returns a typed result `{ allowed, source: 'purchase' | 'subscription' | null, subscriptionId?, graceActive? }`.
- Migrate lecture and exam gates to it. Keep the "expired subscription never revokes prior purchases" invariant documented in code comments.

### 1.3 Expiry status sweeper

- **Problem:** `status` stays `'active'` forever after `expires_at` passes; the access layer is date-safe but every display/query filtering on `status` is wrong.
- **Fix (two layers):**
  - **Lazy correction:** whenever `getActiveSubscriptions`-type queries run, compare dates and return computed status (`active` / `grace` / `expired`) — never trust the raw column for display.
  - **Batch sweeper:** a Vercel Cron route (`app/api/cron/subscriptions-sweep/route.ts`, protected by `CRON_SECRET` header check) that runs daily: flips `active → expired` where `expires_at + grace < now`, emits `expired` events into `subscription_events`, and (Milestone 5) queues expiry-warning notifications.
- **Acceptance:** DB never shows an `active` row past grace end for more than 24h; every UI reads computed status.

---

## Milestone 2 — Permissions & Admin Consistency

**Objective:** One canonical admin path, correct RBAC everywhere.

### 2.1 Sidebar RBAC mismatch

- `components/dashboard/sidebar.tsx:72` — change the subscriptions nav item guard from `resource: 'payments'` to `resource: 'subscriptions'`, matching `middleware.ts`.
- Audit all other sidebar items against middleware route guards in one pass (cheap while you're there).

### 2.2 Unify admin assignment paths

- After M0.1's delegation, decide: keep `assign/` page as UI but with zero business logic of its own (all actions re-exported from the canonical module), or fold the assign UI into `app/admin/subscriptions` and delete the duplicate directory.
- **Recommendation:** fold and delete — two pages doing the same job is how the guard got missed in the first place.

### 2.3 Admin subscription detail & audit view

- Add a per-subscription drawer/page in admin: plan snapshot, full `subscription_events` timeline (assigned / renewed / expired / cancelled / payment_recorded), actor names, grace status.
- Wire the currently-dead `payment_recorded` event type: emit it when Milestone 3's approval flow confirms a payment.
- Remove the `getSubscriptionSummaryForStudent` dead export or wire it into this view — pick one, don't leave it exported-and-unused.

---

## Milestone 3 — Commercial Funnel: Subscription Requests (the missing half of the system)

**Objective:** A student can go from a public plan card → request → receipt upload → admin approval → active subscription, with zero manual DB work. This mirrors the proven `orders` pattern exactly.

### 3.1 Schema addition (Prisma migration)

New model `subscription_requests`:

```
id, student_id, plan_id,
plan_snapshot Json          // price & scopes frozen at request time
status enum: pending | approved | rejected | cancelled
receipt_url String?
payment_method String?      // vodafone_cash / instapay / bank ... match orders enum
admin_note String?, student_note String?
reviewed_by String?, reviewed_at DateTime?
created_at, updated_at
@@index([student_id, status]), @@index([status, created_at])
```

- Deliberately a **separate table from `orders`** (different lifecycle, different fulfillment), but same status vocabulary and same receipt-storage mechanism (reuse the existing upload path/Blob logic the orders flow uses).
- **Constraint:** at most one `pending` request per (student, plan) — enforce in the action + partial unique index if feasible.

### 3.2 Student request flow

- `/student/subscriptions`: replace the WhatsApp toast with a real "Subscribe" dialog: plan summary, payment instructions (from platform settings), receipt upload, optional note → creates `subscription_requests` row (server action, validates plan is `is_active AND public_visible`, validates mode allows subscriptions — see 4.1).
- Show the student's request states on the same page: pending (with "cancel request"), rejected (with admin note), approved (links to the active subscription card).
- **Guard rails:** reject request creation if student already has an active/grace subscription covering the same plan.

### 3.3 Admin approval queue

- New tab in `app/admin/subscriptions`: pending requests table (student, plan, price snapshot, receipt preview, age of request).
- **Approve action (single transaction):** mark request `approved` → call canonical `assignSubscription` (which does overlap check, snapshot, `assigned` event) → emit `payment_recorded` event with receipt reference.
- **Reject action:** status `rejected` + required admin note.
- Badge count of pending requests on the sidebar item (same pattern as pending orders if one exists).

### 3.4 Close the registration funnel (`planId` handoff)

- Public plan page CTA already links to `/auth/register?planId=...` — make registration honor it:
  - Persist `planId` through the registration form (hidden field / search param passthrough, including any multi-step flow).
  - On successful registration + login, redirect to `/student/subscriptions?planId=...` which auto-opens the request dialog from 3.2 for that plan.
- **Nice-to-have:** also support `?planId=` for already-logged-in students hitting the public page — CTA becomes "Subscribe now" linking straight to the dialog.

### 3.5 Renewal path

- On a subscription in grace or ≤7 days from expiry, the student card shows "Renew" → same request dialog, pre-filled.
- On approval, `assignSubscription` extends from `expires_at` (not from approval date) if still active, or starts fresh if expired — emit `renewed` event. This logic belongs in `subscription-manager.ts`.

---

## Milestone 4 — Mode-Aware Public Surface & Display Truthfulness

**Objective:** The UI never advertises or displays something the access engine won't honor.

### 4.1 `subscription_mode` gates all subscription UI

- Create `lib/subscription-public.ts` helper `getPublicSubscriptionContext()` returning `{ mode, subscriptionsEnabled }`.
- **When mode is `purchases_only`:** hide plan sections on the homepage, stage/branch pages, `/subscriptions/*`, and the student subscriptions marketing area (existing subscriptions remain visible but marked "غير مفعل حاليًا" / paused). Block new request creation server-side too (never trust hidden UI).
- **When mode is `subscriptions_only`:** (audit) ensure purchase CTAs are equivalently hidden — verify the orders side already does this; if not, note and fix symmetrically.

### 4.2 Honor `public_visible`

- Student plans query: `is_active: true AND public_visible: true`.
- Public pages: same filter — make it consistent everywhere via one shared query function `getVisiblePlans()` so it can't drift again.

### 4.3 Truthful subscription status display

- Student "my subscriptions" list: fetch `active` **and grace-eligible** rows (date-computed, per 1.3 lazy logic), display three badges: `فعال` (green), `فترة سماح — جدد الآن` (amber, with days remaining), `منتهي` (gray, with renew CTA).
- Show coverage summary per subscription (which stages/branches/courses it unlocks) derived from `plan_snapshot` — snapshot, not live plan, so admin edits to the plan don't misrepresent what the student bought.

---

## Milestone 5 — Notifications & Lifecycle Automation

**Objective:** No silent expiries; admin and student both informed.

### 5.1 Expiry warnings

- Extend the M1.3 cron sweep: for subscriptions expiring in 7 days and 1 day, create in-app notifications (reuse the platform's existing notifications table/mechanism — audit `prisma/schema.prisma` for it; if none exists, add a minimal `notifications` model as part of this milestone).
- Grace-entered and expired events also notify the student with a renew link.

### 5.2 Admin digests

- Notification/badge for: new pending subscription request, request older than 48h unreviewed.
- **Idempotency:** notifications keyed by `(subscription_id, type, window)` so the cron never double-sends.

---

## Milestone 6 — Hardening, Data Integrity & Verification

**Objective:** Lock in correctness and prove the whole flow end-to-end.

### 6.1 Transactional integrity audit

- Ensure `assignSubscription`, approval flow, and renewal all run in `prisma.$transaction`. Any event write must be in the same transaction as the state change.
- Add idempotency to the approval action (double-click / retry safe): re-approving an already-approved request is a no-op.

### 6.2 Input validation layer

- Zod schemas for every subscription server action input (plan ids as cuid/uuid, dates, enums). Reject rather than coerce.

### 6.3 Seed & test data script

- `scripts/seed-subscriptions.ts`: creates 2–3 realistic plans (full-access monthly, single-stage term plan, single-course plan), a few students with subscriptions in each state (active / grace / expired), and pending requests — the DB is currently empty of real subscription data, which is why none of these bugs surfaced.

### 6.4 End-to-end verification checklist (browser-verified before merge)

1. Public plan → register with `planId` → auto-opened request dialog → upload receipt → admin approves → lecture in scope unlocks, lecture out of scope stays locked, exams follow the same boundary.
2. Switch mode to `purchases_only` → all plan marketing disappears, existing subscription shows paused, previously purchased lectures still open.
3. Expire a subscription (manipulate `expires_at`) → grace badge appears, content still opens; past grace → sweeper flips status, content locks, purchases untouched.
4. Assistant account with `subscriptions` permission sees the sidebar link and the page; `payments`-only assistant sees neither.
5. Unauthenticated POST to every subscription server action → rejected.

---

## Suggested Execution Order & Dependencies

| Order | Milestone | Depends on | Risk if skipped |
|---|---|---|---|
| 1 | M0 Security patch | — | Live privilege-escalation + leaked creds |
| 2 | M1 Access logic | M0 | Students unlock unpaid content (exams) |
| 3 | M2 Admin/RBAC | M0 | Confused admins, drift returns |
| 4 | M3 Funnel | M1, M2 | System stays admin-manual-only |
| 5 | M4 Mode-aware UI | M1 | Students pay for plans that unlock nothing |
| 6 | M5 Notifications | M1.3, M3 | Silent churn at expiry |
| 7 | M6 Hardening/E2E | all | Regressions ship unnoticed |

---

## Future Ideas (out of scope, noted only)

- Plan-level `max_subscribers` caps for limited cohorts.
- Promo/discount codes on subscription requests.
- Auto-generated payment reference codes to match receipts faster.
- A public "compare plans" matrix generated from plan scopes.

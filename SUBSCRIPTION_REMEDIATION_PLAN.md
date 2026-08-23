# Subscription System — Comprehensive Remediation & Completion Plan

**Project:** LMS Platform — Subscription Management System
**Branch:** `subscription-management-system`
**Document status:** THIS IS THE SOURCE OF TRUTH. Every executing agent must treat this file as the contract. Deviations require an explicit note in the "Deviation Log" section at the bottom of this file.

**Goal:** Close all security holes, fix logic inconsistencies, complete the commercial funnel, and bring the subscription system to a production-ready standard — while preserving the existing (well-designed) core engine: `lib/subscription-manager.ts`, `lib/subscription-access.ts`, `lib/lecture-access.ts`, and the Prisma schema.

---

# ⚠️ MANDATORY RULES FOR THE EXECUTING MODEL — READ BEFORE TOUCHING ANY CODE

> These rules exist because previous audits found bugs caused by exactly the behaviors banned below (duplicate logic paths, missed guards, copy-paste drift). Violating any rule below is considered a failed milestone.

## R1 — Scope discipline (DO NOT WANDER)
1. Work on **ONE milestone at a time**, in the exact order listed. Never start milestone N+1 before milestone N passes its Verification Gate.
2. Within a milestone, execute tasks in the listed order (0.1 → 0.2 → 0.3 ...).
3. **DO NOT** refactor, rename, reformat, or "improve" any code outside the files explicitly listed in the current task. If you notice an unrelated bug, write it in the Deviation Log — do not fix it now.
4. **DO NOT** rewrite the core engine files (`subscription-manager.ts`, `subscription-access.ts`, `lecture-access.ts`) beyond the exact changes specified. They are audited and correct. Route through them; do not replace them.
5. **DO NOT** change the Prisma schema except where a task explicitly says "Schema change". No opportunistic column additions.
6. **DO NOT** touch the `orders` system's behavior. You may READ its patterns to copy conventions; you may not modify its code unless a task says so.

## R2 — No rushing / no shortcuts (DO NOT BREAK THE WORK)
1. **Read before writing.** Before editing any file, read the ENTIRE file first — not just the lines you think you need. Many bugs in this codebase came from partial reads.
2. **Search before creating.** Before creating any helper/function/component, grep the codebase for an existing one. This codebase already had TWO parallel assignment paths because someone skipped this step.
3. **One canonical implementation per behavior.** If you find yourself copying logic between two files, STOP — extract it to a shared function in `lib/` and import it in both places.
4. **Never delete an import before deleting its usage.** Remove usage first, then the import.
5. **Every DB state change on subscriptions MUST write a `subscription_events` row in the same transaction.** No exceptions.
6. **All server actions MUST start with an auth/permission guard as the FIRST statement.** This is the exact bug class that caused the M0 emergency. Check every action you write or touch.
7. Run `npx prisma validate` after any schema edit, and ensure the project builds (`pnpm build` or the project's build script) before declaring a task done. A milestone with a broken build is a FAILED milestone.
8. **Do not invent APIs from memory.** Verify Prisma model names, field names, and enum values against `prisma/schema.prisma` before writing queries. Verify function signatures by reading the actual file.
9. If a task's instructions conflict with what you find in the code, **STOP and re-read the code and the task**. If the conflict is real, record it in the Deviation Log with your resolution and reasoning — do not silently pick one.

## R3 — Mandatory Post-Milestone Review (SELF-AUDIT GATE)
After finishing EACH milestone, before starting the next one, you MUST perform this review ritual:

1. **Re-open this plan file** and re-read the completed milestone's section top to bottom.
2. **Create a compliance table** in the Milestone Completion Log (bottom of this file) with one row per task item, columns: `Task | Implemented? | File(s) touched | Matches plan exactly? | Notes`.
3. **Verify every Acceptance Criterion** listed for the milestone — actually verify it (read the code again / run the check / query the DB), do not assume it from memory of what you just wrote.
4. **Diff review:** run `git diff --stat` for the milestone's commits and confirm NO files outside the milestone's declared scope were modified. If any were, justify in the Deviation Log or revert them.
5. **Build check:** confirm the app builds and the dev server boots with no new errors.
6. Only after all 5 steps pass, write `✅ MILESTONE N VERIFIED — <date>` in the Completion Log and proceed.

> If ANY acceptance criterion fails during review: fix it within the same milestone, then redo the review from step 1. Never carry known failures forward.

## R4 — Things that look tempting but are FORBIDDEN
- ❌ Merging `subscription_requests` into the `orders` table "to simplify". They have different lifecycles. Keep them separate as specified.
- ❌ Trusting the `status` column of `student_subscriptions` for any access decision. Access is date-computed. Status is display/reporting only.
- ❌ Making expired subscriptions revoke previously approved purchases. Purchases are PERMANENT. This invariant is the heart of the system.
- ❌ Adding OAuth, payments gateways (Stripe etc.), or any external service not in this plan. The platform uses manual receipt review by design.
- ❌ "Cleaning up" Arabic UI strings, translations, or unrelated components.
- ❌ Skipping the browser-verification steps because "the code looks right".

---

# Codebase Map (verified facts — trust these, re-verify paths before editing)

| Concern | Location |
|---|---|
| Prisma schema (all models) | `prisma/schema.prisma` |
| Core assignment engine (canonical, guarded, correct) | `lib/subscription-manager.ts` — `assignSubscription()` does overlap check, `plan_snapshot`, `subscription_events` |
| Access decision layer (date-safe, grace-aware) | `lib/subscription-access.ts` |
| Lecture gating (correct: purchase OR covering subscription) | `lib/lecture-access.ts` |
| Public plans helper | `lib/subscription-public.ts` |
| Canonical admin actions (guarded with `requireSubscriptionManager`) | `app/admin/subscriptions/actions.ts` |
| **VULNERABLE duplicate admin actions (NO GUARD)** | `app/admin/subscriptions/assign/actions.ts` |
| Student subscriptions page (WhatsApp toast dead-end) | `app/student/subscriptions/page.tsx` + `client.tsx` |
| **Exam access bug (any subscription unlocks ALL exams)** | `app/student/exams/actions.ts` (~lines 75–77) |
| Public plan detail page (CTA → `/auth/register?planId=`) | `app/subscriptions/[planId]/page.tsx` |
| Registration (currently IGNORES `planId`) | `app/auth/register/` |
| Sidebar with RBAC mismatch (`payments` vs `subscriptions`) | `components/dashboard/sidebar.tsx` (~line 72) |
| Middleware route guards + phantom `/api/webhooks` whitelist | `middleware.ts` |
| Leaked credentials | `.env.example` |
| Proven receipt→pending→approval pattern to mirror | `orders` model + its admin/student flows |

**Known DB state at audit time:** `subscription_mode = 'purchases_only'`; one inactive "Test Plan"; zero student subscriptions; zero events. The system has never run with real data.

**Guiding principles:**
- The core access engine is correct — do NOT rewrite it. All fixes route *through* it.
- Reuse the proven `orders` pattern (receipt → pending → admin approval) instead of inventing new flows.
- Every state change goes through `subscription_events` for auditability.
- Fix order: Security → Logic correctness → Permissions → Commercial funnel → Display truthfulness → Automation → Hardening.

---

# Milestone 0 — Emergency Security Patch

**Objective:** Eliminate the unauthenticated admin actions and leaked credentials. Smallest possible diff. Nothing else ships before this.
**Allowed file scope:** `app/admin/subscriptions/assign/actions.ts`, `.env.example`, `middleware.ts`. NOTHING else.

### Task 0.1 — Guard and neutralize `app/admin/subscriptions/assign/actions.ts`
**Why:** Every exported server action in this file (assignment + student search) is callable by ANY authenticated user — or possibly unauthenticated — because it has no permission guard. It also bypasses overlap checks, `plan_snapshot`, and event logging.

Steps (in order):
1. Read the ENTIRE file. List every exported server action you find (expected: `assignSubscriptionToStudent`, `searchStudents`; there may be more — guard ALL of them).
2. Read `app/admin/subscriptions/actions.ts` and identify the exact guard used there (`requireSubscriptionManager()` or equivalent). Import and call the SAME guard — do not write a new guard.
3. Add the guard as the **first statement** of every exported action.
4. Rewrite `assignSubscriptionToStudent` to be a thin wrapper that delegates to `assignSubscription()` in `lib/subscription-manager.ts`. Delete the duplicated inline logic (direct `prisma.student_subscriptions.create` etc.). The wrapper only adapts input shape → calls canonical function → returns result.
5. `searchStudents`: after guarding, reduce the returned payload to the minimum the assign UI actually renders. Read the consuming component first to know what it uses. Remove phone numbers from the payload if the UI does not display them; if it does, keep but note it in the Completion Log.
6. Verify the assign UI still works with the wrapper's return shape (read the client component; adjust the wrapper's return mapping if needed — do NOT change the canonical function's signature).

**Acceptance criteria:**
- [ ] Zero exported actions in this file without a guard as the first statement.
- [ ] No direct `prisma.student_subscriptions.create/update` calls remain in this file.
- [ ] Assignment through this path produces: overlap check + `plan_snapshot` + `subscription_events` row (verify by reading `assignSubscription`'s code path, then by a test assignment if DB access is available).
- [ ] Project builds.

### Task 0.2 — Sanitize `.env.example` + credential rotation notice
Steps:
1. Replace every real value in `.env.example` with placeholders:
   - `DATABASE_URL="postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require"`
   - `DIRECT_URL="postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require"`
   - `NEXTAUTH_SECRET="generate-with: openssl rand -base64 32"`
   - Keep all other keys as empty/placeholder values. Do not remove keys — other developers use this file as the reference list.
2. Confirm no other tracked file contains the same leaked values: search the repo for the leaked password substring and the secret. (Do NOT print the secrets into logs/output while searching.)
3. **⚠️ MANUAL USER ACTION (cannot be automated — surface it loudly in your final message):** the DB password and `NEXTAUTH_SECRET` are in git history and must be treated as compromised. The user must rotate the Neon/Postgres password and generate a new `NEXTAUTH_SECRET`, then update Vercel env vars. Do not proceed silently past this — state it explicitly.

**Acceptance criteria:**
- [ ] No real credential in any tracked file.
- [ ] Rotation requirement communicated to the user in the milestone summary.

### Task 0.3 — Middleware whitelist cleanup
Steps:
1. Read `middleware.ts` fully.
2. Remove `/api/webhooks` from `PUBLIC_PATHS` (no such route exists in the codebase — verify with a glob for `app/api/webhooks` before removing; if a route DOES exist, stop and record in Deviation Log instead).
3. Do not touch any other entry in the whitelist.

**Acceptance criteria:**
- [ ] Phantom path removed; all existing public routes still reachable (verify the auth pages and public plan pages still load in the browser).

### 🔒 Milestone 0 Verification Gate
Perform the full R3 ritual. Additionally:
- Attempt (conceptually or via test) an unauthenticated/unauthorized call to each action in `assign/actions.ts` → must be rejected.
- `git diff --stat` shows ONLY the 3 allowed files changed.

---

# Milestone 1 — Access-Logic Correctness

**Objective:** Every content gate (lectures, exams, and any other checkpoint) respects plan scopes and `subscription_mode` identically. One shared matcher — zero copy-paste.
**Allowed file scope:** `lib/subscription-access.ts`, `lib/lecture-access.ts`, `app/student/exams/actions.ts`, new file `app/api/cron/subscriptions-sweep/route.ts`, `vercel.json` (cron entry only), plus read-only exploration anywhere.

### Task 1.1 — Extract the shared scope-coverage matcher
Steps:
1. Read `lib/lecture-access.ts` and `lib/subscription-access.ts` fully. Locate the exact logic that decides whether a set of `subscription_plan_scopes` covers a lecture (all-content / stage / branch / term / course / lecture levels).
2. Extract it into a **pure function** in `lib/subscription-access.ts`:
   ```ts
   export function subscriptionCoversTarget(
     scopes: PlanScope[],
     target: { stageId?: string; branchId?: string; termId?: string; courseId?: string; lectureId?: string }
   ): boolean
   ```
   Pure = no DB calls, no side effects. It receives scopes + target coordinates and returns a boolean.
3. Refactor `lecture-access.ts` to call this function. Behavior must be IDENTICAL — this is an extraction, not a redesign. Compare the before/after logic line by line.
4. Do not change any other behavior in these files.

**Acceptance criteria:**
- [ ] `lecture-access.ts` contains no inline scope-matching logic — only the call to the shared function.
- [ ] The function handles every scope level present in the schema (verify against `subscription_plan_scopes` model — check the actual column/enum names in `prisma/schema.prisma`).

### Task 1.2 — Fix the exam scope bypass
**Why:** `app/student/exams/actions.ts` currently grants ALL exams to any student with ANY active subscription — plan scopes are ignored. A plan for one lecture unlocks the entire exam bank.

Steps:
1. Read `app/student/exams/actions.ts` fully. Locate the subscription shortcut (~lines 75–77).
2. Determine how exams attach to content: read the exam model(s) in `prisma/schema.prisma` — do exams belong to a lecture, a course, or both? Map every possibility you find.
3. Replace the shortcut: for each exam, resolve its content coordinates (lectureId and/or courseId → termId → branchId → stageId — fetch the chain if needed, prefer a single query with `include`), then call `subscriptionCoversTarget(scopes, coordinates)`.
4. Ensure `subscription_mode` is honored EXACTLY as lectures do: in `purchases_only` mode, subscriptions must not unlock exams at all. Read how `lecture-access.ts` resolves the mode and mirror it — ideally through the same entry function (see Task 1.3).
5. Preserve the purchase-based exam access path untouched — only the subscription branch changes.

**Acceptance criteria:**
- [ ] A subscription scoped to course A unlocks ONLY course A's exams.
- [ ] In `purchases_only` mode, a subscription unlocks zero exams.
- [ ] Purchase-based exam access is byte-for-byte unchanged in behavior.

### Task 1.3 — Centralized access facade
Steps:
1. In `lib/subscription-access.ts` (or `lecture-access.ts` if more natural — decide by reading both, pick ONE home), create/confirm a single entry point:
   ```ts
   checkContentAccess(studentId, target): Promise<{
     allowed: boolean
     source: 'purchase' | 'subscription' | null
     subscriptionId?: string
     graceActive?: boolean
   }>
   ```
   Internally: resolve `subscription_mode` → check purchases (unless `subscriptions_only`) → check subscriptions with grace (unless `purchases_only`) → return typed result.
2. Migrate the lecture gate and the exam gate (from 1.2) to call this facade.
3. Add a code comment on the facade documenting the invariant: **"An expired subscription NEVER revokes previously approved purchases. Purchases are permanent."**

**Acceptance criteria:**
- [ ] Lectures and exams both route through the facade; no gate re-implements mode logic.
- [ ] Grep confirms no other file directly queries `student_subscriptions` for an access decision (admin/reporting queries are fine — access decisions only).

### Task 1.4 — Full checkpoint audit (read-only sweep)
Steps:
1. Grep the whole `app/` tree for every place content is gated: files/attachments downloads, video URLs/tokens, lecture lists, exam lists, anything checking `purchases`, `orders`, or `student_subscriptions`.
2. For each checkpoint found: confirm it routes through the facade or the purchase system correctly. List every checkpoint and its verdict in the Completion Log.
3. If a checkpoint is broken, fix it USING the facade — but if the fix is large/risky, record it in the Deviation Log and flag for a follow-up instead of improvising.

### Task 1.5 — Expiry status sweeper
**Why:** `status` stays `'active'` forever; access is date-safe but every status-filtered query/display lies.

Steps:
1. **Lazy layer:** add a pure helper `computeSubscriptionStatus(sub, gracePeriodDays, now): 'active' | 'grace' | 'expired'` in `lib/subscription-access.ts`. Every display/query path (used in M4) will call this — never trust the raw column.
2. **Batch layer:** create `app/api/cron/subscriptions-sweep/route.ts`:
   - `GET` handler; first statement verifies `Authorization: Bearer ${process.env.CRON_SECRET}` — reject 401 otherwise.
   - Flips `active → expired` where `expires_at + grace < now` (grace read from platform settings — read how settings are fetched elsewhere in the codebase and reuse that helper).
   - For every flipped row, inserts an `expired` event in `subscription_events` **in the same transaction** (`prisma.$transaction`).
   - Returns a JSON summary `{ swept: n }`.
3. Add the cron entry to `vercel.json` (create the `crons` key if absent; do not disturb existing config): daily schedule, e.g. `0 3 * * *`.
4. `CRON_SECRET`: check if it exists in project env; if not, flag to the user to add it (do NOT hardcode a value).

**Acceptance criteria:**
- [ ] Sweeper route rejects requests without the secret.
- [ ] Sweep flips status + writes events transactionally.
- [ ] `computeSubscriptionStatus` exists, is pure, and handles all three states with correct boundary conditions (exactly at `expires_at`, within grace, past grace).

### 🔒 Milestone 1 Verification Gate
Full R3 ritual, plus: manually trace (on paper / in the log) one scenario per mode (`hybrid`, `purchases_only`, `subscriptions_only`) × (lecture, exam) = 6 traces, writing the expected outcome of each and confirming the code produces it.

---

# Milestone 2 — Permissions & Admin Consistency

**Objective:** One canonical admin path, correct RBAC everywhere, full audit visibility.
**Allowed file scope:** `components/dashboard/sidebar.tsx`, `app/admin/subscriptions/**`, `lib/subscription-manager.ts` (additions only).

### Task 2.1 — Fix the sidebar RBAC mismatch
Steps:
1. Read `components/dashboard/sidebar.tsx` fully and `middleware.ts`'s route→resource mapping.
2. Change the subscriptions nav item guard from `resource: 'payments'` to `resource: 'subscriptions'` (~line 72 — verify the actual line, don't trust the number).
3. **Full sidebar audit:** build a table of every sidebar item's `resource` vs the middleware guard of the route it links to. Fix ONLY items where they mismatch. Record the table in the Completion Log.

**Acceptance criteria:**
- [ ] An assistant with only `subscriptions` permission sees the link AND can open the page; a `payments`-only assistant sees neither.
- [ ] The audit table is complete and every row matches.

### Task 2.2 — Fold the duplicate assign path
Steps:
1. Read `app/admin/subscriptions/assign/` (page + client + actions) and the main `app/admin/subscriptions/` page.
2. Move the assign UI (student search + plan pick + duration) into the main subscriptions admin page as a dialog/section, reusing the M0-guarded wrapper logic — but now import actions directly from the canonical `app/admin/subscriptions/actions.ts` (add an action there if the main file lacks an equivalent; delegate to `assignSubscription`).
3. Delete the entire `app/admin/subscriptions/assign/` directory ONLY after: (a) the new UI is working, (b) grep confirms nothing else imports from it, (c) any nav links pointing to `/admin/subscriptions/assign` are updated.
4. Follow the deletion rule: remove usages → remove links → remove files.

**Acceptance criteria:**
- [ ] One admin path for assignment; `assign/` directory gone; zero broken imports/links (build passes, admin page browser-verified).

### Task 2.3 — Admin subscription detail & audit view
Steps:
1. Add a per-subscription detail drawer/dialog in the admin subscriptions page: plan snapshot contents, status (computed via `computeSubscriptionStatus`), grace info, and the full `subscription_events` timeline (event type, actor name via relation, timestamp, metadata).
2. Resolve the dead code from the audit — pick exactly one option per item and record the choice:
   - `getSubscriptionSummaryForStudent`: wire it into this view OR delete the export.
   - `payment_recorded` event type: keep it (it gets emitted in M3.3) — add a comment noting M3 wires it.

**Acceptance criteria:**
- [ ] Admin can see the full lifecycle of any subscription without touching the DB.
- [ ] No exported-but-unused subscription functions remain (grep-verified).

### 🔒 Milestone 2 Verification Gate
Full R3 ritual, plus browser verification of the admin flow: search student → assign plan → subscription appears with snapshot + `assigned` event visible in the detail view.

---

# Milestone 3 — Commercial Funnel: Subscription Requests

**Objective:** Student goes from public plan card → request → receipt upload → admin approval → active subscription, with zero manual DB work. Mirrors the proven `orders` pattern.
**Allowed file scope:** `prisma/schema.prisma` (new model only), new migration, `app/student/subscriptions/**`, `app/admin/subscriptions/**`, `app/auth/register/**`, `lib/subscription-manager.ts` (renewal addition), `app/subscriptions/[planId]/page.tsx` (CTA only).

### Task 3.1 — Schema: `subscription_requests`
Steps:
1. Read the `orders` model in `prisma/schema.prisma` first — mirror its conventions (id type, enum style, naming, relation patterns) exactly.
2. Add:
   ```prisma
   model subscription_requests {
     id             String   @id @default(cuid())        // match the project's id convention
     student_id     String
     plan_id        String
     plan_snapshot  Json                                  // price + scopes frozen at request time
     status         subscription_request_status @default(pending)
     receipt_url    String?
     payment_method String?                               // match orders' payment method values
     student_note   String?
     admin_note     String?
     reviewed_by    String?
     reviewed_at    DateTime?
     created_at     DateTime @default(now())
     updated_at     DateTime @updatedAt
     // relations to students, subscription_plans, reviewer — mirror orders' relation style
     @@index([student_id, status])
     @@index([status, created_at])
   }
   enum subscription_request_status { pending approved rejected cancelled }
   ```
   Adapt names/types to the ACTUAL conventions found in the schema (snake_case vs camelCase, cuid vs uuid, existing enum patterns). The block above is the shape, not literal text.
3. Run `npx prisma validate`, then apply the migration using the project's established migration method (check how previous migrations were applied — `prisma migrate dev`, `db push`, or SQL scripts — and use the SAME method).
4. **Do NOT** add subscription items to `order_items`. Requests are deliberately a separate table.

**Acceptance criteria:**
- [ ] Migration applied; `prisma validate` clean; client regenerated; build passes.

### Task 3.2 — Student request flow
Steps:
1. Read `app/student/subscriptions/page.tsx` + `client.tsx` fully, and read the student ORDER creation flow (receipt upload mechanism, payment instructions display) to reuse its components/upload path.
2. Replace the WhatsApp toast with a "Subscribe" dialog: plan summary (name, price, duration, coverage), payment instructions (same settings source the orders flow uses), receipt upload (same Blob/upload mechanism as orders — reuse, don't rebuild), optional student note.
3. Server action `createSubscriptionRequest(planId, receiptUrl, note)`:
   - Guard: authenticated student (first statement).
   - Validate: plan exists AND `is_active` AND `public_visible`; mode allows subscriptions (`subscription_mode !== 'purchases_only'`); no existing `pending` request for (student, plan); no active/grace subscription already covering this plan.
   - Snapshot the plan (price + scopes) into `plan_snapshot`.
   - Create the row. All validation server-side — never trust the client.
4. `cancelSubscriptionRequest(requestId)`: student can cancel own `pending` request only (verify ownership).
5. Render request states on the page: pending (cancel button), rejected (show `admin_note`), approved (link/scroll to the active subscription card).

**Acceptance criteria:**
- [ ] No WhatsApp toast remains.
- [ ] Every validation in step 3 provably enforced in the server action (not only in UI).
- [ ] Duplicate pending request attempt → clear Arabic error message, no row created.

### Task 3.3 — Admin approval queue
Steps:
1. Add a "طلبات الاشتراك" (Subscription Requests) tab/section in `app/admin/subscriptions`: table with student, plan, snapshot price, receipt preview (same viewer as orders), request age, notes.
2. `approveSubscriptionRequest(requestId)` — single `prisma.$transaction`:
   - Guard first.
   - Idempotency: if already `approved`, return success as no-op.
   - Mark `approved` + `reviewed_by`/`reviewed_at` → call canonical `assignSubscription()` (overlap check, snapshot, `assigned` event) → emit `payment_recorded` event referencing the receipt URL and request id in metadata.
   - If `assignSubscription` fails (e.g. overlap), the whole transaction rolls back and the admin sees the reason.
3. `rejectSubscriptionRequest(requestId, adminNote)`: guard, require non-empty note, mark `rejected`.
4. Pending-count badge on the sidebar subscriptions item — copy the pattern used for pending orders if one exists; if none exists, add a simple server-fetched count.

**Acceptance criteria:**
- [ ] Approve is transactional and idempotent (double-click safe).
- [ ] Approval produces: request `approved` + subscription row + `assigned` event + `payment_recorded` event — all four, atomically.
- [ ] Reject requires a note; student sees it.

### Task 3.4 — Registration `planId` handoff
Steps:
1. Read the full registration flow in `app/auth/register/` (every step if multi-step).
2. Carry `planId` from the URL search param through the entire flow (hidden field or param passthrough at each step).
3. After successful registration + login, if `planId` present: redirect to `/student/subscriptions?planId=...`.
4. In the student subscriptions client, on mount with `?planId=`: validate the plan is visible/active, auto-open the Subscribe dialog for it. Invalid/hidden plan → ignore the param silently (no crash, no error page).
5. Public plan page (`app/subscriptions/[planId]/page.tsx`): if the viewer is already a logged-in student, CTA becomes "اشترك الآن" linking to `/student/subscriptions?planId=...` instead of the register link. Read how the page detects sessions elsewhere before implementing.

**Acceptance criteria:**
- [ ] Full funnel works end-to-end in the browser: public plan → register → land on dialog pre-opened for that plan.
- [ ] Logged-in student on the public page skips registration entirely.

### Task 3.5 — Renewal path
Steps:
1. In `lib/subscription-manager.ts`, extend `assignSubscription` (or add `renewSubscription` that reuses its internals — read the function first and pick the cleaner option, record the choice):
   - If the student has an active/grace subscription for the same plan: new period extends from `expires_at`, event type `renewed`.
   - If expired: fresh period from now, event `assigned`.
2. Student card: show "جدد الاشتراك" (Renew) when in grace OR ≤7 days from expiry → opens the same request dialog pre-filled; the request flows through the same admin queue; approval triggers the renewal logic above.

**Acceptance criteria:**
- [ ] Renewing an active subscription never shortens it (extends from `expires_at`, not from approval date).
- [ ] `renewed` event emitted with correct metadata.

### 🔒 Milestone 3 Verification Gate
Full R3 ritual, plus the complete funnel browser-verified with a real test plan and test student (create them via admin UI, not raw SQL).

---

# Milestone 4 — Mode-Aware Public Surface & Display Truthfulness

**Objective:** The UI never advertises or displays anything the access engine won't honor.
**Allowed file scope:** `lib/subscription-public.ts`, every page that renders plan marketing (homepage, stage/branch pages, `/subscriptions/**`, student subscriptions page).

### Task 4.1 — `subscription_mode` gates all subscription UI
Steps:
1. Grep for EVERY place plans are rendered publicly or to students. List all of them in the Completion Log before changing anything.
2. Add `getPublicSubscriptionContext(): Promise<{ mode, subscriptionsEnabled }>` to `lib/subscription-public.ts` (`subscriptionsEnabled = mode !== 'purchases_only'`).
3. When `purchases_only`: hide plan marketing sections everywhere (homepage, stage/branch pages, `/subscriptions/*` should show a "غير متاح حاليًا" state or redirect); the student's EXISTING subscriptions stay visible but badged "غير مفعل حاليًا".
4. Server-side enforcement already exists from 3.2 (request creation blocked) — verify it, don't duplicate it.
5. **Audit only** (fix only if trivial): in `subscriptions_only` mode, are purchase CTAs hidden symmetrically on the orders side? Record findings; large fixes go to the Deviation Log.

### Task 4.2 — Honor `public_visible` everywhere via one query
Steps:
1. Create `getVisiblePlans()` in `lib/subscription-public.ts`: `is_active: true AND public_visible: true`, with scopes included.
2. Replace EVERY plan-listing query (student page currently filters only `is_active`) with this function. Grep to confirm no direct `subscription_plans.findMany` for display remains outside it (admin pages are exempt — admins see everything).

### Task 4.3 — Truthful status display
Steps:
1. Student "my subscriptions": fetch rows whose COMPUTED status (via `computeSubscriptionStatus`) is `active` or `grace` — plus recently expired ones (≤30 days) for the renew CTA.
2. Badges: `فعال` (active), `فترة سماح — جدد الآن` + days remaining (grace), `منتهي` + renew CTA (expired).
3. Coverage summary per subscription derived from `plan_snapshot` — NOT the live plan (admin edits must not misrepresent what the student bought).

**Acceptance criteria (whole milestone):**
- [ ] In `purchases_only`: zero plan marketing anywhere public/student; existing subscriptions visibly paused.
- [ ] A `public_visible: false` plan appears nowhere outside admin.
- [ ] A grace subscription is VISIBLE to the student with the amber badge (this was previously hidden — regression-check it specifically).
- [ ] All badges derive from computed status, never the raw column.

### 🔒 Milestone 4 Verification Gate
Full R3 ritual, plus browser matrix: (mode × page) — flip `subscription_mode` through all three values in admin settings and screenshot-verify homepage, a stage page, `/subscriptions`, and the student page in each mode. Flip it back to its original value when done.

---

# Milestone 5 — Notifications & Lifecycle Automation

**Objective:** No silent expiries; admin and student both informed.
**Allowed file scope:** the notifications mechanism (existing or new model), `app/api/cron/subscriptions-sweep/route.ts`, sidebar badge components.

### Task 5.1 — Discover or create the notifications mechanism
Steps:
1. Audit `prisma/schema.prisma` and the app for an existing in-app notifications system. If it exists → reuse it, full stop.
2. If none exists: add a minimal `notifications` model (recipient_id, type, title, body, link, read_at, created_at + index on recipient/read) and a simple bell/list UI consistent with the existing dashboard design. Keep it minimal — this is infrastructure, not a feature showcase.

### Task 5.2 — Expiry warnings via the sweeper
Steps:
1. Extend the M1.5 cron: notify students at 7 days and 1 day before expiry, on grace entry, and on final expiry — each with a renew link to `/student/subscriptions`.
2. **Idempotency is mandatory:** key notifications by `(subscription_id, type, window)` — check-before-insert inside the transaction so re-runs never double-send.

### Task 5.3 — Admin signals
Steps:
1. Notify/badge admins on: new pending subscription request; any request older than 48h unreviewed (sweeper checks this).
2. Reuse the pending-count badge from 3.3; do not create a second counting mechanism.

**Acceptance criteria:**
- [ ] Running the sweeper twice in a row produces zero duplicate notifications (test this explicitly).
- [ ] Every notification's link lands on the correct page.

### 🔒 Milestone 5 Verification Gate
Full R3 ritual, plus: manipulate a test subscription's `expires_at` through the allowed admin path (or a temporary script that is deleted afterward), run the sweeper manually with the secret, verify exactly one notification per window.

---

# Milestone 6 — Hardening, Data Integrity & Final End-to-End Verification

**Objective:** Lock in correctness and prove the whole system end-to-end against THIS document.
**Allowed file scope:** subscription-related `lib/` and action files (validation additions only), `scripts/seed-subscriptions.ts` (new).

### Task 6.1 — Transactional integrity audit
1. Read every write path: `assignSubscription`, renewal, approve/reject request, sweeper. Confirm each runs its state change + event write inside one `prisma.$transaction`. Fix any that don't.
2. Confirm approval idempotency (from 3.3) with an actual double-invocation test.

### Task 6.2 — Input validation layer
1. Add Zod schemas for every subscription server action's inputs (ids match the project's id format, enums via `z.enum`, dates, note length caps). Reject invalid input with a clear error — never coerce silently.
2. Grep all subscription actions to confirm none parses `formData`/args without validation.

### Task 6.3 — Seed script
1. Create `scripts/seed-subscriptions.ts` (runnable via `node --env-file-if-exists=... ` or the project's script convention — check existing scripts first):
   - 3 plans: full-access monthly, single-stage term plan, single-course plan.
   - Test students with subscriptions in each computed state (active / grace / expired) and a pending + a rejected request.
2. The script must be idempotent (safe to re-run) and clearly marked as dev/test-only.

### Task 6.4 — FINAL end-to-end checklist (browser-verified, every line checked off)
1. [ ] Public plan → register with `planId` → auto-opened dialog → upload receipt → admin approves → in-scope lecture unlocks; out-of-scope lecture stays locked; exams follow the SAME boundary.
2. [ ] Switch to `purchases_only` → plan marketing gone; existing subscription badged paused; previously purchased lectures still open; subscriptions unlock nothing (lectures AND exams).
3. [ ] Switch to `subscriptions_only` → purchases ignored per the engine; subscription-covered content opens.
4. [ ] Expire a subscription → grace badge + content still opens; past grace → sweeper flips it, content locks, purchases untouched, `expired` event exists.
5. [ ] Assistant with `subscriptions` permission: sees sidebar link + page works. `payments`-only assistant: neither.
6. [ ] Every subscription server action rejects unauthenticated/unauthorized calls.
7. [ ] Double-approve a request → exactly one subscription, one `assigned` event.
8. [ ] Renewal of an active subscription extends from `expires_at`.
9. [ ] Restore `subscription_mode` to its production-intended value when finished.

### 🔒 Milestone 6 Verification Gate — FINAL PLAN AUDIT
This gate is different: re-read this ENTIRE document from the top. For every milestone, confirm its Completion Log entry exists, its compliance table is complete, and every acceptance checkbox is checked. Produce a final summary table: `Milestone | Tasks | Deviations | Verified date`. Any unchecked box = the work is NOT done, regardless of how it looks.

---

# Execution Order & Dependencies

| Order | Milestone | Depends on | Risk if skipped |
|---|---|---|---|
| 1 | M0 Security patch | — | Live privilege-escalation + leaked creds |
| 2 | M1 Access logic | M0 | Students unlock unpaid content (exams) |
| 3 | M2 Admin/RBAC | M0 | Confused admins, drift returns |
| 4 | M3 Funnel | M1, M2 | System stays admin-manual-only |
| 5 | M4 Mode-aware UI | M1, M3 | Students pay for plans that unlock nothing |
| 6 | M5 Notifications | M1.5, M3 | Silent churn at expiry |
| 7 | M6 Hardening/E2E | all | Regressions ship unnoticed |

---

# Future Ideas (OUT OF SCOPE — do not implement)

- Plan-level `max_subscribers` caps for limited cohorts.
- Promo/discount codes on subscription requests.
- Auto-generated payment reference codes to match receipts faster.
- A public "compare plans" matrix generated from plan scopes.

---

# Milestone Completion Log

> The executing model appends entries here after each Verification Gate. Never edit previous entries.

_(empty — no milestone completed yet)_

---

# Deviation Log

> Any deviation from this plan, any out-of-scope bug discovered, any conflict between the plan and the code — recorded here with date, description, and resolution. Silent deviations are forbidden.

_(empty)_

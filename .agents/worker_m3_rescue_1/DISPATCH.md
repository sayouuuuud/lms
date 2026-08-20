## 2026-08-20T19:16:33Z

You are the Worker for Milestone 3 (M3: Rescue System & WhatsApp Integration).
Your working directory is: d:/Workspace/LMS/.agents/worker_m3_rescue_1
Parent Conversation ID: c8a26d78-1fc4-425e-be25-836551fea616

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Authoritative Files to Read FIRST:
1. d:/Workspace/LMS/.agents/ORIGINAL_REQUEST.md
2. d:/Workspace/LMS/PROJECT.md
3. d:/Workspace/LMS/TEST_INFRA.md
4. d:/Workspace/LMS/.agents/survey_explorer_rescue/report.md
5. d:/Workspace/LMS/.agents/sub_orch_m3_rescue/SCOPE.md

Your Exclusive Target Files to Implement:
1. `scripts/003_rescue_system.sql`: SQL migration creating `public.rescue_cases` table with proper constraints (`trigger_type`, `priority`, `status`), indexes, unique open case deduplication index, and platform settings columns (`rescue_whatsapp_cooldown_hours`, `rescue_hourly_limit`, `rescue_auto_notify`).
2. `prisma/schema.prisma`: Add `rescue_cases` model and update relations on `students`. Run `npx prisma generate` (via cmd /c) to sync the client.
3. `lib/rescue.ts`: Core detection and queue management:
   - Evaluates at-risk detection rules:
     * `PURCHASED_INACTIVE`: Student has approved order >= 3 days ago with 0 watch progress on course lessons. Risk score: 80, Priority: high.
     * `RECURRING_FAILURE`: Student has >= 2 failed exams (status 'راسب' or score < 50%) in last 30 days. Risk score: 85, Priority: high.
     * `ABANDONED_FLOW`: Completed >= 80% of lessons in lecture/course >= 3 days ago but 0 exam submissions for that lecture. Risk score: 70, Priority: medium.
     * `INACTIVE_STUDENT`: Enrolled/purchased with no presence (last_seen_at) or learning activity for >= 14 days. Risk score: 65, Priority: medium.
   - Case deduplication: prevent creating duplicate OPEN/CONTACTED/IN_PROGRESS cases for same student + trigger.
   - Status lifecycle transitions: `open` -> `contacted` -> `in_progress` -> `resolved` / `dismissed`.
   - Batch scanner: `runRescueScan()` / `evaluateStudentRisk(studentId)`.
4. `lib/rescue-notifier.ts`: WhatsApp messaging & anti-spam engine:
   - Student-level cooldown: Checks if any WhatsApp message was sent to the student within 72 hours (configurable). If within cooldown, block dispatch with `cooldownBlocked: true` and remaining hours.
   - Hourly burst limiter: Checks total sent messages within the current hour (e.g. max 50).
   - Template engine: Generates high quality, personalized Arabic motivational messages for each trigger type.
   - Phone normalization: Standardize phone using `normalizeEgyptPhone` (E.164 without plus).
   - Sandbox / Mock Provider: In test or dev (`WHATSAPP_SANDBOX=true` or test mode), log to `whatsapp_messages` with status `'sent'` without making external HTTP requests.
   - Audit logging: Record logs in `whatsapp_messages` and update `rescue_cases` status to `contacted` and set `last_contacted_at`.
5. `app/admin/rescue/actions.ts`: Server actions for admin UI:
   - `runRescueScanAction()`
   - `getRescueCasesAction(filters)`
   - `sendRescueWhatsAppAction(caseId, customText, options)`
   - `updateRescueCaseStatusAction(caseId, status, notes)`
6. `scripts/test_rescue_system.mjs`: Standalone integration test verifying:
   - Rule 1 detection (PURCHASED_INACTIVE) and case creation.
   - Rule 2 detection (RECURRING_FAILURE).
   - Rule 3 detection (ABANDONED_FLOW).
   - Rule 4 detection (INACTIVE_STUDENT).
   - WhatsApp message dispatch in sandbox mode.
   - WhatsApp 72-hour student cooldown enforcement (immediate 2nd attempt blocked).
   - Case status lifecycle (`contacted` -> `resolved`) and resolution notes persistence.
   - Execute the test with `node scripts/test_rescue_system.mjs` (prefix with cmd /c) and verify 100% tests pass.

# Handoff Report: Survey Explorer 3 (Rescue System & WhatsApp Specialist)

- **Author**: Survey Explorer 3 (Rescue System & WhatsApp Specialist)
- **Role**: Explorer / Investigator
- **Milestone**: Phase 1 Codebase Survey & Analysis (R3 Rescue System & WhatsApp)
- **Date**: 2026-08-20

---

## 1. Observation

Direct code and database inspections confirmed the following facts:

1. **Student Purchase & Watch Progress Tracking**:
   - Course and lecture purchases are stored in `orders` (`student_id` = `auth.users.id`, `status` = `'approved'`, `created_at`) and `order_items` (`lecture_id`, `monthly_course_id`, `price`).
   - Detailed video watch telemetry is tracked in `lesson_watch_progress` (`max_percent`, `watched_seconds`, `duration_seconds`, `completed` where `max_percent >= 90`, `views_count`, `last_viewed_at`).
   - Granular video drop-off retention is tracked in `lesson_segment_viewers` (`lesson_id`, `segment_index` 0..19, `user_id`).
   - Daily learning duration is logged in `learning_activity` (`student_id`, `activity_date`, `minutes`).
   - Real-time student presence is tracked via `students.last_seen_at` (`app/student/presence-actions.ts:16`).

2. **Exam & Assessment Failure Tracking**:
   - Exam attempts are recorded in `exam_submissions` (`student_id`, `exam_id`, `score`, `total`, `status` = `'ناجح' | 'راسب' | 'قيد التصحيح'`, `grading_status`, `submitted_at`).
   - Individual question responses are tracked in `exam_answers` (`question_id`, `is_correct`, `awarded_points`).

3. **Notification & WhatsApp Stack**:
   - In-app notification infrastructure exists in `lib/notify.ts` (`createNotification`) and models `notifications`, `notification_reads`.
   - Internal ticketing messages exist in `messages` table (`app/student/messages/actions.ts`).
   - WhatsApp integration exists in `lib/whatsapp.ts` connecting to **Evolution API** (`EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE`).
   - Sent and queued WhatsApp messages are persisted in `whatsapp_messages` (`to_phone`, `template`, `body`, `status`, `provider_message_id`, `error`, `student_id`, `created_at`, `sent_at`).
   - Currently, `whatsapp_messages` template check constraint is `CHECK (template IN ('login_otp', 'payment_approved', 'custom'))`.
   - Phone normalization is implemented in `lib/phone.ts` (`normalizeEgyptPhone`).

4. **Existing Background Services & Workers**:
   - A video transcoding service exists in `services/transcoder` (Docker/Node.js).
   - No background cron runner or queue worker exists in Next.js for scheduled rescue scans or periodic jobs.

5. **Identified Missing Components for R3**:
   - No persistent `rescue_cases` table in the database schema.
   - No automated multi-rule at-risk student detector engine.
   - No WhatsApp cooldown/anti-spam enforcement logic (per-student cooldown, per-case cooldown, burst rate limiter).
   - No Admin Rescue Queue dashboard `/admin/rescue`.
   - No integration test script for validating rescue case creation, WhatsApp sandbox dispatch, and cooldown suppression.

---

## 2. Logic Chain

1. **At-Risk Identification**:
   - Since `orders` + `order_items` record approved purchases with timestamps, and `lesson_watch_progress` / `student_content_progress` record lesson view telemetry, an at-risk condition for **"Purchased but Inactive"** can be deterministically identified by selecting students with approved orders $\ge N$ days ago (default $N = 3$) where watched minutes or lesson progress is 0.
   - Since `exam_submissions` records each attempt score and pass status (`'راسب'`), **"Recurring Failures"** can be deterministically detected by finding students with $\ge 2$ failed submissions in the last 30 days.
   - Since `students.last_seen_at` tracks user presence, **"Abandoned Flow / Chronic Inactivity"** can be detected when `last_seen_at` exceeds 14 days or when prerequisite lectures are finished without exam submission.

2. **Persistence & Queue Management**:
   - Creating a `rescue_cases` table with a partial unique index `(student_id, trigger_type)` on open cases guarantees that at-risk students are deduplicated in the queue and won't generate multiple duplicate open tickets.
   - Supporting status transitions (`open` → `contacted` → `in_progress` → `resolved` / `dismissed`) allows staff to track student interventions and record resolution notes.

3. **Anti-Spam & WhatsApp Cooldown Protection**:
   - WhatsApp messages must be rate-limited to avoid Meta policy violations and user spam complaints.
   - By querying `whatsapp_messages` for recent sends to the student within a 72-hour window before calling `sendWhatsAppText`, the system guarantees strict cooldown enforcement.
   - By implementing a sandbox/mock provider mode (`WHATSAPP_SANDBOX=true`), automated tests can execute end-to-end without spending WhatsApp API credits or requiring a live connected phone instance.

---

## 3. Caveats

- **Network / WhatsApp Credentials**: Live WhatsApp dispatch requires valid Evolution API credentials (`EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE`). However, all architecture and integration tests are designed to seamlessly fallback to Sandbox/Mock mode when credentials are not configured.
- **Background Cron Triggering**: In a serverless Next.js deployment, background cron jobs cannot rely on continuous in-memory intervals. A dedicated route `/api/cron/rescue` protected by `CRON_SECRET` combined with an admin UI manual trigger button provides 100% reliable execution.

---

## 4. Conclusion

All requirements for **R3 (Rescue System & WhatsApp Notifications)** have been thoroughly surveyed, mapped, and architected:
1. The database schema migration (`R03_rescue_system.sql`) and Prisma model for `rescue_cases` have been designed.
2. The 4-rule declarative detection engine (`PURCHASED_INACTIVE`, `RECURRING_FAILURE`, `ABANDONED_FLOW`, `INACTIVE_STUDENT`) is fully specified.
3. The multi-tier WhatsApp cooldown & anti-spam dispatcher (72h cooldown, hourly rate limit, personalized Arabic templates, sandbox mode) is designed and ready for implementation.
4. An end-to-end integration test (`scripts/test_rescue_system.mjs`) is specified to verify student detection, WhatsApp dispatch, and cooldown rejection.

---

## 5. Verification Method

To verify the investigation findings and subsequent implementation:

1. **Schema & Model Verification**:
   - Inspect `prisma/schema.prisma` and ensure `rescue_cases` model is added.
   - Run `npx prisma generate` to ensure types compile.

2. **Codebase Inspection**:
   - Review report at `d:/Workspace/LMS/.agents/survey_explorer_rescue/report.md`.
   - Review `lib/whatsapp.ts`, `lib/phone.ts`, `app/api/lecture-progress/route.ts`, and `app/admin/students/[id]/actions.ts`.

3. **Integration Test Execution**:
   - Run `cmd /c node --env-file-if-exists=.env scripts/test_rescue_system.mjs`.
   - Verify all 4 test assertions pass:
     1. Case generation for at-risk student (`PURCHASED_INACTIVE`).
     2. WhatsApp dispatch via Sandbox Mock Provider and status transition to `contacted`.
     3. Immediate second dispatch rejected due to active 72h cooldown.
     4. Resolution of rescue case with notes.

## 2026-08-20T19:19:41Z
You are the Implementation Worker for Milestone 1 (M1: Exams Edge Cases).
Working directory: d:/Workspace/LMS/.agents/sub_orch_m1_exams/worker_1
Parent: sub_orch_m1_exams

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Authoritative Input Files:
- d:/Workspace/LMS/.agents/ORIGINAL_REQUEST.md
- d:/Workspace/LMS/PROJECT.md
- d:/Workspace/LMS/TEST_INFRA.md
- d:/Workspace/LMS/.agents/sub_orch_m1_exams/SCOPE.md
- d:/Workspace/LMS/.agents/sub_orch_m1_exams/SYNTHESIS.md
- d:/Workspace/LMS/.agents/sub_orch_m1_exams/explorer_1/report.md
- d:/Workspace/LMS/.agents/sub_orch_m1_exams/explorer_2/report.md
- d:/Workspace/LMS/.agents/sub_orch_m1_exams/explorer_3/report.md

Your Assigned Tasks & File Ownership:
1. `scripts/001_exam_attempts.sql`:
   - Create migration script creating `public.exam_attempts` table, foreign keys, partial indexes, RLS policies, update `exam_answers` foreign key to `ON DELETE SET NULL`.
2. `prisma/schema.prisma`:
   - Add `exam_attempts` model with all fields (`id`, `exam_id`, `student_id`, `status`, `started_at`, `expires_at`, `submitted_at`, `answers`, `questions_snapshot`, `score`, `total_points`, `is_locked`, `lock_timestamp`, `idempotency_key`, `created_at`, `updated_at`).
   - Add relations in `exams`, `students`, `exam_submissions`.
   - Run `cmd /c npx prisma generate` to update Prisma client.
3. `lib/exams.ts`:
   - Implement `startOrResumeExamAttempt({ studentId, examIdOrCode })` (idempotent start/resume, snapshot questions & choices without sensitive keys to client, server timer calculation).
   - Implement `saveDraftAnswers({ attemptId, studentId, answers })` (verifies ownership, active status, server deadline, saves JSONB answers).
   - Implement `submitExamAttempt({ attemptId, studentId, answers, idempotencyKey })` (atomic transition `UPDATE exam_attempts SET status = 'submitted'`, grading strictly against `questions_snapshot`, creation of `exam_submissions` and `exam_answers`, idempotent response).
   - Implement `getExamAttemptStatus(attemptId, studentId)`.
4. `app/student/exams/actions.ts`:
   - Connect `getStudentExam` / start / draft save / submit server actions to `lib/exams.ts`.
5. `components/student/exams/exam-detail.tsx`:
   - Implement resume on mount, debounced draft autosave + heartbeat, offline resilience, server-calculated timer, submit button state & idempotency protection.
6. Standalone Verification Scripts (under `scripts/`):
   - `scripts/test_exam_resume.mjs` (simulates disconnect and verifies resumption of answers and server timer).
   - `scripts/test_exam_server_timer.mjs` (verifies server rejection past deadline regardless of client clock tampering).
   - `scripts/test_exam_double_submit.mjs` (verifies concurrent requests produce single grading with zero P2002 errors).
   - `scripts/test_exam_snapshot_integrity.mjs` (verifies attempt grading uses snapshot when underlying questions are edited/deleted).

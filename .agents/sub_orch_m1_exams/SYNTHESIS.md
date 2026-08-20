# Synthesis: Milestone 1 (Exams Edge Cases)

## Consensus
1. **Database & Schema**:
   - Create migration `scripts/001_exam_attempts.sql` adding `public.exam_attempts` table with UUID id, `exam_id`, `student_id`, `status` (`in_progress`, `submitted`, `expired`, `abandoned`), `started_at`, `expires_at`, `submitted_at`, `answers` (JSONB), `questions_snapshot` (JSONB), `score`, `total_points`, `is_locked`, `lock_timestamp`, `idempotency_key`, timestamps.
   - Partial unique index on active attempts: `UNIQUE (exam_id, student_id) WHERE status = 'in_progress'`.
   - Update foreign key constraint on `exam_answers (question_id)` from `ON DELETE CASCADE` to `ON DELETE SET NULL`.
   - Update `prisma/schema.prisma` with `exam_attempts` model and bidirectional relations to `exams`, `students`, `exam_submissions`.
2. **Core Service (`lib/exams.ts`)**:
   - `startOrResumeExamAttempt({ studentId, examIdOrCode })`: Resumes active attempt if exists; otherwise snapshots questions & choices, sets started_at and expires_at, creates attempt. Strips correct answers before client delivery.
   - `saveDraftAnswers({ attemptId, studentId, answers })`: Validates attempt active status and server time remaining; saves draft answers JSONB.
   - `submitExamAttempt({ attemptId, studentId, answers, idempotencyKey })`: Atomic status transition from `in_progress` to `submitted`. Evaluates against `questions_snapshot`. Creates `exam_submissions` and `exam_answers`. Idempotently returns existing submission if already submitted.
   - `getExamAttemptStatus(attemptId, studentId)`: Returns attempt status and remaining seconds calculated from server clock.
3. **Actions & UI**:
   - `app/student/exams/actions.ts`: Exposes `startOrResumeExamAction`, `saveDraftAnswersAction`, `submitExamAttemptAction`.
   - `components/student/exams/exam-detail.tsx`: Resume on mount, debounced draft auto-save, offline indicator & local sync queue, server-driven countdown, submit lock.
4. **Verification Scripts**:
   - `scripts/test_exam_resume.mjs`: Tests network disconnect simulation, draft recovery, and timer persistence.
   - `scripts/test_exam_server_timer.mjs`: Tests client clock spoofing immunity and deadline enforcement.
   - `scripts/test_exam_double_submit.mjs`: Tests 10 concurrent submits for single grading and zero P2002 errors.
   - `scripts/test_exam_snapshot_integrity.mjs`: Tests immunity to teacher edits/deletions of questions during active attempts.

## Resolved Conflicts
- All explorer findings aligned with zero contradictions.

## Dissenting Views
- None.

## Implementation Files
- `scripts/001_exam_attempts.sql`
- `prisma/schema.prisma`
- `lib/exams.ts`
- `app/student/exams/actions.ts`
- `components/student/exams/exam-detail.tsx`
- `scripts/test_exam_resume.mjs`
- `scripts/test_exam_server_timer.mjs`
- `scripts/test_exam_double_submit.mjs`
- `scripts/test_exam_snapshot_integrity.mjs`

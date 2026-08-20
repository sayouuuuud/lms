# Handoff Report — Explorer 2 (Core Service & Edge-Case Logic)
**Status**: Task Complete (Hard Handoff)  
**Agent**: Explorer 2 (Core Service & Edge-Case Logic Specialist)  
**Target Milestone**: Milestone 1 (Exams Edge Cases)  
**Date**: 2026-08-20  

---

## 1. Observation

1. **Current Codebase Exam Submission Logic (`app/student/exams/actions.ts:186-295`)**:
   - `submitExam` checks duplicate submission via non-atomic `prisma.exam_submissions.findFirst({ where: { exam_id: exam.id, student_id: student.id } })` (lines 206-213).
   - If two requests hit simultaneously, both pass the `findFirst` check and attempt `prisma.exam_submissions.create` (lines 265-280), triggering `P2002 Unique Constraint Violation` and failing the second request with a user-facing error `"تعذر تسليم الاختبار."` (line 293).
   - `submitExam` evaluates scores live against `exam_questions` (lines 215-253) rather than a frozen attempt snapshot.
   - `submitExam` does not verify attempt start time, time elapsed, or expiration against any server timestamp.

2. **Client-Side Timer & Session Ephemerality (`components/student/exams/exam-detail.tsx:48-65`)**:
   - `secondsLeft` is initialized as `exam.durationMinutes * 60` in client state and decremented using `setTimeout` (lines 56-65).
   - Reloading the page or disconnecting resets the timer and wipes all answers stored in `const [answers, setAnswers] = useState<Record<string, LocalAnswer>>({})` (line 49).
   - Clicking "بدء الاختبار الآن" (line 188) only sets local state `setPhase('taking')` without initiating any server session or database record.

3. **Prisma Schema Constraints (`prisma/schema.prisma:825-886`)**:
   - `exam_answers` has a cascading foreign key to `exam_questions`:
     `exam_questions exam_questions @relation(fields: [question_id], references: [id], onDelete: Cascade, onUpdate: NoAction)` (line 836).
   - If an instructor deletes a question from `exam_questions`, PostgreSQL automatically cascades and deletes all historical `exam_answers` associated with that question.
   - There is no `exam_attempts` model in `prisma/schema.prisma`.

4. **Prisma RLS & Session Architecture (`lib/prisma.ts:1-210`)**:
   - PostgreSQL session parameters are configured via `setupRlsSession` and `withUserTx` / `extendedPrisma`.
   - Raw SQL operations (`$executeRaw` / `$queryRaw`) can be executed safely within user context and interactive transactions.

---

## 2. Logic Chain

1. **Auto-Resume Logic**:
   - From **Observation 2** (answers and timers exist purely in volatile React state) → Establishing a persistent `exam_attempts` table with `draft_answers JSONB` and `status = 'in_progress'` allows `startOrResumeExamAttempt` to fetch existing active attempts, restore the draft answers, and compute accurate remaining time.
2. **Server-Side Timer Logic**:
   - From **Observation 1 & 2** (absence of server timestamp tracking allows client-side clock tampering) → Computing `expires_at = started_at + duration_minutes * 60 + grace_period` at attempt creation and evaluating `remainingSeconds = Math.max(0, Math.floor((expiresAt - now) / 1000))` on the server guarantees complete tamper immunity.
3. **Atomic Double-Submit & Concurrency Logic**:
   - From **Observation 1** (concurrent requests cause `P2002` crashes on non-atomic checks) → Using atomic conditional state transitions `UPDATE exam_attempts SET status = 'submitted' WHERE id = $attemptId AND status = 'in_progress'` ensures that only one request can transition the attempt. Subsequent or concurrent requests safely retrieve the already-graded submission and return `{ success: true, alreadySubmitted: true }` idempotently.
4. **Snapshot Integrity Logic**:
   - From **Observation 1 & 3** (live queries and `onDelete: Cascade` corrupt student answers on question mutation/deletion) → Capturing `questions_snapshot JSONB` at attempt start, evaluating submissions strictly against that snapshot, and altering `exam_answers.question_id` to `ON DELETE SET NULL` shields historical records from modifications and deletions.

---

## 3. Caveats

1. **Draft Autosave Interval**: Recommended autosave cadence from the client is 5–10 seconds (debounced) or upon each option change. Network errors during autosave should silently fallback to client `localStorage` and retry on network reconnect.
2. **Grace Period**: A 30-second server grace period (`GRACE_PERIOD_SECONDS = 30`) is added to `expires_at` to accommodate mobile network latency without allowing unfair solving time.
3. **Assignments System**: This design is targeted specifically at `exams` for Milestone 1. The parallel `assignments` module can adopt similar snapshotting patterns in future iterations if required.

---

## 4. Conclusion

`lib/exams.ts` must be implemented with four core exported functions:
1. `startOrResumeExamAttempt({ studentId, examIdOrCode })`: Idempotently starts or resumes an attempt, freezes `questions_snapshot`, calculates server `remainingSeconds`, and strips secrets before client delivery.
2. `saveDraftAnswers({ attemptId, studentId, answers })`: Validates attempt ownership and active status, verifies server deadline, and merges draft JSONB with heartbeat updates.
3. `submitExamAttempt({ attemptId, studentId, answers, idempotencyKey })`: Executes atomic conditional status transition, enforces hard deadline check, evaluates scores strictly against `questions_snapshot`, creates `exam_submissions` and `exam_answers`, and returns idempotent results for duplicate calls.
4. `getExamAttemptStatus(attemptId, studentId)`: Returns server-calculated attempt status and remaining seconds.

---

## 5. Verification Method

To verify the implementation of `lib/exams.ts` and its edge-case resilience, run the standalone verification test suites:

1. **Resume Test**:
   - Command: `cmd /c node scripts/test_exam_resume.mjs`
   - Validates attempt resumption with accurate remaining seconds and restored draft answers after simulated disconnect.
2. **Server Timer Test**:
   - Command: `cmd /c node scripts/test_exam_server_timer.mjs`
   - Validates that submissions or draft saves past server `expires_at` are rejected regardless of client clock tampering.
3. **Double Submit Concurrency Test**:
   - Command: `cmd /c node scripts/test_exam_double_submit.mjs`
   - Validates that 10 parallel submissions resolve cleanly to exactly 1 database submission record without throwing `P2002`.
4. **Snapshot Integrity Test**:
   - Command: `cmd /c node scripts/test_exam_snapshot_integrity.mjs`
   - Validates that live edits or deletions of questions in `exam_questions` do not alter the grading or destroy historical submissions.
5. **Invalidation Condition**:
   - Any failure where a client can spoof additional exam time, a duplicate submission throws a 500/P2002 error, or a teacher question modification alters past exam grades invalidates the solution.

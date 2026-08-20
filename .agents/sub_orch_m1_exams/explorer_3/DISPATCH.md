## 2026-08-20T19:16:22Z
You are an Explorer for Milestone 1 (Exams Edge Cases) - Explorer 3 (UI/Actions & Verification Scripts focus).
Working directory: d:/Workspace/LMS/.agents/sub_orch_m1_exams/explorer_3
Parent: sub_orch_m1_exams

Read the authoritative files:
- d:/Workspace/LMS/.agents/ORIGINAL_REQUEST.md
- d:/Workspace/LMS/PROJECT.md
- d:/Workspace/LMS/TEST_INFRA.md
- d:/Workspace/LMS/.agents/sub_orch_m1_exams/SCOPE.md
- d:/Workspace/LMS/.agents/survey_explorer_exams/report.md
- d:/Workspace/LMS/app/student/exams/
- d:/Workspace/LMS/components/student/exams/

Investigate and design:
1. Server actions in `app/student/exams/actions.ts` integrating with `lib/exams.ts`.
2. UI component `components/student/exams/exam-detail.tsx`:
   - Handles resume on mount (recovers draft answers and server remaining time).
   - Auto-saves draft answers periodically (e.g. debounced or interval) and on answer selection.
   - Handles network disconnection gracefully (local queue/retry, visual indicator, resume on reconnect).
   - Server-driven countdown timer. Prevents submission after expiration.
   - Disables double submit on frontend while ensuring backend handles race conditions.
3. Standalone Verification Scripts architecture:
   - `scripts/test_exam_resume.mjs`: creates attempt, simulates disconnect, starts/resumes, verifies answers & remaining timer.
   - `scripts/test_exam_server_timer.mjs`: simulates client submitting after server expires_at, verifies rejection.
   - `scripts/test_exam_double_submit.mjs`: executes concurrent Promise.all submissions, verifies single grading and idempotency.
   - `scripts/test_exam_snapshot_integrity.mjs`: starts attempt, alters/deletes underlying questions, submits attempt, verifies grading matches snapshot.

Output your detailed findings and technical recommendations to `d:/Workspace/LMS/.agents/sub_orch_m1_exams/explorer_3/report.md` and write a handoff report to `d:/Workspace/LMS/.agents/sub_orch_m1_exams/explorer_3/handoff.md`. Send a brief completion message with send_message to parent when done.

## 2026-08-20T19:16:22Z

You are an Explorer for Milestone 1 (Exams Edge Cases) - Explorer 2 (Core Service & Edge-Case Logic focus).
Working directory: d:/Workspace/LMS/.agents/sub_orch_m1_exams/explorer_2
Parent: sub_orch_m1_exams

Read the authoritative files:
- d:/Workspace/LMS/.agents/ORIGINAL_REQUEST.md
- d:/Workspace/LMS/PROJECT.md
- d:/Workspace/LMS/TEST_INFRA.md
- d:/Workspace/LMS/.agents/sub_orch_m1_exams/SCOPE.md
- d:/Workspace/LMS/.agents/survey_explorer_exams/report.md
- d:/Workspace/LMS/.agents/survey_explorer_exams/handoff.md
- Any existing exam services/lib in `lib/` or `app/`

Investigate and design:
1. `lib/exams.ts`: Function signatures, exact logic for:
   - `startOrResumeExamAttempt({ studentId, examId })`: Checks for existing active attempt. If active, returns attempt with remaining server time and draft answers. If none, snapshots current questions & choices, sets started_at and expires_at, inserts record.
   - `saveDraftAnswers({ attemptId, studentId, answers })`: Validates attempt ownership, active status, server time remaining. Updates answers JSONB.
   - `submitExamAttempt({ attemptId, studentId, answers })`: Concurrency lock / idempotency check. Verifies server time remaining (with grace period if needed or hard deadline). Computes grade against `questions_snapshot`. Updates status to submitted, marks score, releases lock.
   - Server-side timer calculation: `remainingSeconds = Math.max(0, Math.floor((expiresAt - now) / 1000))` - entirely authoritative on server.
   - Concurrency locking mechanism for double submission.
   - Snapshot integrity: guarantees evaluation uses snapshot regardless of edits to questions table.

Output your detailed findings and technical recommendations to `d:/Workspace/LMS/.agents/sub_orch_m1_exams/explorer_2/report.md` and write a handoff report to `d:/Workspace/LMS/.agents/sub_orch_m1_exams/explorer_2/handoff.md`. Send a brief completion message with send_message to parent when done.

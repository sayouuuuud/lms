# BRIEFING — 2026-08-20T19:18:15Z

## Mission
Investigate and design the core service architecture (`lib/exams.ts`) and edge-case handling logic for Milestone 1 (Exams Edge Cases).

## 🔒 My Identity
- Archetype: explorer
- Roles: investigator, synthesizer
- Working directory: d:/Workspace/LMS/.agents/sub_orch_m1_exams/explorer_2
- Original parent: 1fc2cc60-d98a-4542-9ac3-66ff2fee1986
- Milestone: M1 (Exams Edge Cases) - Explorer 2 (Core Service & Edge-Case Logic focus)

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Design `lib/exams.ts` architecture, algorithms, concurrency controls, server-side timer, and snapshot integrity
- Deliver `report.md`, `handoff.md`, and notify parent via `send_message`

## Current Parent
- Conversation ID: 1fc2cc60-d98a-4542-9ac3-66ff2fee1986
- Updated: 2026-08-20T19:18:15Z

## Investigation State
- **Explored paths**: `prisma/schema.prisma`, `app/student/exams/actions.ts`, `components/student/exams/exam-detail.tsx`, `lib/auth-guard.ts`, `lib/prisma.ts`, `PROJECT.md`, `TEST_INFRA.md`, `SCOPE.md`, `survey_explorer_exams/report.md`, `survey_explorer_exams/handoff.md`
- **Key findings**: Complete technical design for `lib/exams.ts`, covering `startOrResumeExamAttempt`, `saveDraftAnswers`, `submitExamAttempt`, `getExamAttemptStatus`, server-enforced countdown timer with 30s grace period, atomic conditional locking for double-submit prevention, and immutable JSONB snapshotting for question mutation protection.
- **Unexplored areas**: None within M1 scope.

## Key Decisions Made
- `lib/exams.ts` decoupled from Next.js server actions / request cookies to guarantee direct testability by standalone Node.js E2E test scripts.
- Atomic SQL updates (`UPDATE exam_attempts SET status = 'submitted' WHERE id = $1 AND status = 'in_progress'`) chosen for high-concurrency race protection and zero-error idempotency.
- Foreign key constraint on `exam_answers.question_id` updated to `ON DELETE SET NULL` to shield student records from teacher deletions.

## Artifact Index
- `d:/Workspace/LMS/.agents/sub_orch_m1_exams/explorer_2/report.md` — Core Service & Edge-Case Logic Deep-Dive Report
- `d:/Workspace/LMS/.agents/sub_orch_m1_exams/explorer_2/handoff.md` — 5-Component Handoff Report
- `d:/Workspace/LMS/.agents/sub_orch_m1_exams/explorer_2/progress.md` — Liveness heartbeat
- `d:/Workspace/LMS/.agents/sub_orch_m1_exams/explorer_2/DISPATCH.md` — Dispatch record

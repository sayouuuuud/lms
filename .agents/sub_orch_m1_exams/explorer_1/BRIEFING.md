# BRIEFING — 2026-08-20T19:18:30Z

## Mission
Investigate and design the exact SQL schema for `scripts/001_exam_attempts.sql` and the Prisma model in `prisma/schema.prisma` for Milestone 1 (Exams Edge Cases).

## 🔒 My Identity
- Archetype: explorer
- Roles: [investigation, synthesis]
- Working directory: d:/Workspace/LMS/.agents/sub_orch_m1_exams/explorer_1
- Original parent: 1fc2cc60-d98a-4542-9ac3-66ff2fee1986 (sub_orch_m1_exams)
- Milestone: Milestone 1 - Exams Edge Cases (Schema & DB Migration focus)

## 🔒 Key Constraints
- Read-only investigation — do NOT modify source code directly except reports in .agents folder
- Follow project conventions for Prisma and Supabase SQL
- Document comprehensive schema design, relations, indexes, triggers, and compatibility

## Current Parent
- Conversation ID: 1fc2cc60-d98a-4542-9ac3-66ff2fee1986
- Updated: 2026-08-20T19:18:30Z

## Investigation State
- **Explored paths**: `PROJECT.md`, `TEST_INFRA.md`, `SCOPE.md`, `ORIGINAL_REQUEST.md`, `prisma/schema.prisma`, `scripts/R01_rls_and_security_setup.sql`, `scripts/apply_all_migrations.mjs`, `lib/prisma.ts`, `app/student/exams/actions.ts`
- **Key findings**: Complete DDL designed for `exam_attempts` including snapshotting, timer enforcement, locking, triggers, cleanup functions, and Supabase-compatible RLS policies. Detailed Prisma model definitions specified.
- **Unexplored areas**: None for this milestone focus.

## Key Decisions Made
- `exam_attempts.answers` stores JSONB map of draft answers for incremental saving.
- `exam_attempts.questions_snapshot` stores complete question objects including correct answers on server for grading immunity against teacher edits.
- Added partial unique index `(student_id, exam_id) WHERE status = 'in_progress'` to guarantee single active attempt.
- Modified `exam_answers.question_id` foreign key behavior to `ON DELETE SET NULL` to prevent cascade wipeouts.
- Linked `exam_submissions` to `exam_attempts` via nullable `attempt_id`.

## Artifact Index
- `d:/Workspace/LMS/.agents/sub_orch_m1_exams/explorer_1/report.md` — Detailed technical schema design report
- `d:/Workspace/LMS/.agents/sub_orch_m1_exams/explorer_1/handoff.md` — 5-Component handoff report
- `d:/Workspace/LMS/.agents/sub_orch_m1_exams/explorer_1/progress.md` — Progress tracker
- `d:/Workspace/LMS/.agents/sub_orch_m1_exams/explorer_1/DISPATCH.md` — Dispatch log

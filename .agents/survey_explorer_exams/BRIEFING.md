# BRIEFING — 2026-08-20T19:11:30Z

## Mission
Investigate the existing LMS codebase at d:/Workspace/LMS to map out all details regarding Exams, quizzes, assessments, attempt lifecycle, timers, disconnect handling, double submit prevention, question snapshotting, and DB schemas for R1.

## 🔒 My Identity
- Archetype: Explorer / Specialist
- Roles: Survey Explorer 1 (Exams System Specialist)
- Working directory: d:/Workspace/LMS/.agents/survey_explorer_exams
- Original parent: 53884783-d58f-4013-a2d6-da8168ecc549
- Milestone: Survey Phase 0 — R1 Exams

## 🔒 Key Constraints
- Read-only investigation — do NOT modify LMS source code or run destructive migrations
- Produce structured report at d:/Workspace/LMS/.agents/survey_explorer_exams/report.md
- Produce complete self-contained handoff.md
- Focus on R1: Disconnects/auto-resume, server-side timer, double submit prevention, question snapshotting

## Current Parent
- Conversation ID: 53884783-d58f-4013-a2d6-da8168ecc549
- Updated: 2026-08-20T19:11:30Z

## Investigation State
- **Explored paths**:
  - `prisma/schema.prisma` (models `exams`, `exam_questions`, `exam_submissions`, `exam_answers`, `question_bank_*`)
  - `lib/prisma.ts` (RLS session setup, `withUserTx`, `$transaction`)
  - `app/student/exams/actions.ts` (`getStudentExam`, `submitExam`)
  - `app/student/exams/[id]/page.tsx`
  - `components/student/exams/exam-detail.tsx` (Client-side timer, state, submission UI)
  - `components/student/exams/student-exams-page.tsx`
  - `app/student/actions/exams-assignments.ts` (`getStudentExams`, `getStudentAssignments`)
  - `app/admin/exams/actions.ts` & `app/admin/exams/[id]/actions.ts`
  - `lib/exam-builder.ts`, `lib/exams-data.ts`, `lib/question-bank.ts`
  - `lib/auth-guard.ts` & `lib/device-guard.ts`
- **Key findings**:
  - Absence of `exam_attempts` model (attempts live purely in client React state).
  - Timer is 100% client-side with no server timestamp validation in `submitExam`.
  - Double submit triggers raw Postgres unique constraint error `P2002` causing student-facing failure alerts.
  - Foreign key `exam_answers.question_id` has `onDelete: Cascade` risking historical answer deletion if admin edits/deletes questions.
- **Unexplored areas**: None for R1 scope.

## Key Decisions Made
- Formulated comprehensive design for `exam_attempts` table, atomic transitions, server-side expiration checks, client draft auto-save, and immutable question snapshotting.
- Completed authoritative report `report.md` and self-contained `handoff.md`.

## Artifact Index
- `d:/Workspace/LMS/.agents/survey_explorer_exams/report.md` — Detailed survey and architecture report
- `d:/Workspace/LMS/.agents/survey_explorer_exams/handoff.md` — 5-component handoff report
- `d:/Workspace/LMS/.agents/survey_explorer_exams/progress.md` — Progress log and liveness heartbeat
- `d:/Workspace/LMS/.agents/survey_explorer_exams/DISPATCH.md` — Dispatch history

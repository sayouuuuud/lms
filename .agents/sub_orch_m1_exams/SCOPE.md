# Scope: Milestone 1 — Exams Edge Cases

## Architecture & Requirements
This milestone delivers full edge-case protection for the exam taking system in the LMS:
1. **Network Disconnection / Sudden Power Loss**:
   - Resumption of in-progress exam attempts.
   - Preserves remaining server time and draft answers stored continuously.
2. **Client Clock Tampering**:
   - Server calculates remaining time from `started_at` + `duration_minutes`.
   - Rejects answers submitted after deadline regardless of client clock.
3. **Double Submission / Race Conditions**:
   - Idempotent submission endpoint.
   - Concurrent calls return same result or graceful lock rejection without multiple grading.
4. **Question Editing / Deletion During Active Attempt**:
   - Snapshot questions and choices in `exam_attempts.questions_snapshot` (JSONB) at start.
   - Student attempt evaluates against the snapshot, immune to subsequent teacher edits.

## Feature Inventory
| # | Feature | Description | Target Files |
|---|---------|-------------|--------------|
| F1 | `exam_attempts` schema & migration | Table creation with status, snapshots, locks, timestamps | `scripts/001_exam_attempts.sql`, `prisma/schema.prisma` |
| F2 | Server-side exam attempt manager | start/resume, draft autosave, submit, timer verification, idempotency | `lib/exams.ts` |
| F3 | Student UI & actions integration | Server actions & auto-sync exam detail component | `app/student/exams/actions.ts`, `components/student/exams/exam-detail.tsx` |
| F4 | Resumption test harness | Proves timer preservation and draft answers recovery | `scripts/test_exam_resume.mjs` |
| F5 | Server timer spoofing harness | Proves submission past deadline fails on server regardless of client time | `scripts/test_exam_server_timer.mjs` |
| F6 | Double submission concurrency harness | Proves parallel submits produce exactly 1 final graded attempt | `scripts/test_exam_double_submit.mjs` |
| F7 | Snapshot integrity harness | Proves teacher modification/deletion of questions does not affect active attempts | `scripts/test_exam_snapshot_integrity.mjs` |

## Milestones & Work Items
| # | Work Item | Scope | Status |
|---|-----------|-------|--------|
| 1 | Exploration & Technical Plan | Map Prisma models, existing exam components, db schema | PLANNED |
| 2 | Implementation (Migration, Schema, Service, UI, Scripts) | Complete all M1 deliverables | PLANNED |
| 3 | Review & Challenge & Audit | 2 Reviewers, 2 Challengers, 1 Forensic Auditor | PLANNED |
| 4 | Gate & Handoff | Synthesize verdicts and report back to parent | PLANNED |

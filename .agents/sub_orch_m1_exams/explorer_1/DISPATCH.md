## 2026-08-20T19:16:22Z
You are an Explorer for Milestone 1 (Exams Edge Cases) - Explorer 1 (Schema & DB Migration focus).
Working directory: d:/Workspace/LMS/.agents/sub_orch_m1_exams/explorer_1
Parent: sub_orch_m1_exams

Read the authoritative files:
- d:/Workspace/LMS/.agents/ORIGINAL_REQUEST.md
- d:/Workspace/LMS/PROJECT.md
- d:/Workspace/LMS/TEST_INFRA.md
- d:/Workspace/LMS/.agents/sub_orch_m1_exams/SCOPE.md
- d:/Workspace/LMS/.agents/survey_explorer_exams/report.md
- d:/Workspace/LMS/.agents/survey_explorer_exams/handoff.md
- d:/Workspace/LMS/prisma/schema.prisma

Investigate and design:
1. Exact SQL schema for `scripts/001_exam_attempts.sql`: table structure, fields (id, student_id, exam_id, status: in_progress/submitted/expired, started_at, expires_at, submitted_at, answers JSONB, questions_snapshot JSONB, score, total_points, is_locked, lock_timestamp, created_at, updated_at), foreign keys, indexes, triggers/functions if applicable.
2. Prisma model definition in `prisma/schema.prisma` matching the database schema and establishing relations to User, Exam, etc.
3. Compatibility with existing schema and Supabase Postgres conventions.

Output your detailed findings and technical recommendations to `d:/Workspace/LMS/.agents/sub_orch_m1_exams/explorer_1/report.md` and write a handoff report to `d:/Workspace/LMS/.agents/sub_orch_m1_exams/explorer_1/handoff.md`. Send a brief completion message with send_message to parent when done.

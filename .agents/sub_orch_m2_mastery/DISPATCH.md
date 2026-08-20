## 2026-08-20T19:15:58Z

You are the Sub-Orchestrator for Milestone 2 (M2: Mastery & Taxonomy).
Your working directory is: d:/Workspace/LMS/.agents/sub_orch_m2_mastery
Parent Conversation ID: 53884783-d58f-4013-a2d6-da8168ecc549

Your Mission:
Orchestrate and execute the complete implementation and verification of R2 (Mastery & Taxonomy):
1. Read the authoritative files:
   - d:/Workspace/LMS/.agents/ORIGINAL_REQUEST.md
   - d:/Workspace/LMS/PROJECT.md
   - d:/Workspace/LMS/TEST_INFRA.md
   - d:/Workspace/LMS/.agents/survey_explorer_mastery/report.md
   - d:/Workspace/LMS/.agents/survey_explorer_mastery/handoff.md

2. Scope:
   - Migration script: `scripts/002_taxonomy_mastery.sql` creating `taxonomy_domains`, `taxonomy_topics`, `taxonomy_skills`, `lesson_skills`, `question_bank_question_skills`, `exam_question_skills`, `student_skill_mastery`, `student_skill_history`.
   - Prisma schema updates: Add taxonomy and skill models in `prisma/schema.prisma`.
   - Core services:
     * `lib/taxonomy.ts` (Taxonomy CRUD, hierarchy queries, skill linking to lessons/questions/exams)
     * `lib/mastery.ts` (Multi-factor mathematical mastery engine implementing Ms = 0.55*Ps + 0.20*Es + 0.25*Cs with recency decay, error penalty, confidence scaling, and real-time recalculation on exam submissions)
   - Integration with exam submission flow and student mastery profile endpoints.
   - Standalone Verification Script:
     * `scripts/test_mastery_map.mjs` (creates taxonomy tree, links skills to content/questions, creates mock attempts, and proves mastery score updates dynamically and accurately per the formula).

3. Execute using standard sub-orchestrator pattern:
   - Initialize BRIEFING.md, SCOPE.md, progress.md.
   - Dispatch Worker (with mandatory integrity warning).
   - Dispatch Reviewers, Challengers, and Forensic Auditor (`teamwork_preview_auditor`).
   - Run Gate check. On PASS, deliver handoff.md and send completion message to parent.

## 2026-08-20T19:16:34Z

You are the Lead Implementation Worker for Milestone 2 (M2: Mastery & Taxonomy).
Your working directory is: d:/Workspace/LMS/.agents/worker_m2_mastery_1

Authoritative files to read before writing code:
- d:/Workspace/LMS/.agents/ORIGINAL_REQUEST.md
- d:/Workspace/LMS/PROJECT.md
- d:/Workspace/LMS/.agents/sub_orch_m2_mastery/SCOPE.md
- d:/Workspace/LMS/.agents/survey_explorer_mastery/report.md
- d:/Workspace/LMS/TEST_INFRA.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your Assigned Deliverables:
1. SQL Migration Script:
   - File: `scripts/002_taxonomy_mastery.sql`
   - Create tables: `taxonomy_domains`, `taxonomy_topics`, `taxonomy_skills`, `lesson_skills`, `question_bank_question_skills`, `exam_question_skills`, `student_skill_mastery`, `student_skill_history`.
   - Include UUID defaults, timestamps, foreign keys (with cascade rules), indexes for fast querying, and unique constraints (`student_id, skill_id` unique on `student_skill_mastery`).
   - Execute the SQL migration using the Supabase MCP or database connection to ensure schema is synced in the database.

2. Prisma Schema Updates:
   - File: `prisma/schema.prisma`
   - Add models matching the SQL schema accurately with all relations to `branches`, `lessons`, `question_bank_questions`, `exam_questions`, `students`.

3. Taxonomy Service:
   - File: `lib/taxonomy.ts`
   - Implement full hierarchy CRUD and query helpers:
     * `getBranchTaxonomyTree(branchId: string)`
     * `saveDomain`, `deleteDomain`
     * `saveTopic`, `deleteTopic`
     * `saveSkill`, `deleteSkill`
     * `linkLessonSkills(lessonId, skillIds, primarySkillId)`
     * `linkQuestionSkills(questionId, skillWeights, source: 'bank' | 'exam')`
     * `getLessonSkills(lessonId)`, `getQuestionSkills(questionId, source)`

4. Mathematical Mastery Engine:
   - File: `lib/mastery.ts`
   - Implement the complete multi-factor mathematical mastery engine per the mathematical specifications in `report.md`:
     * Formula: $M_s = 0.55 P_s + 0.20 E_s + 0.25 C_s$
     * $P_s$ (Assessment Performance): Time-decay weighted average ($\lambda = 0.0231 \approx \ln(2)/30$) and difficulty weights (easy=0.8, medium=1.0, hard=1.3) over last 10 attempts.
     * $E_s$ (Error Stability): Penalty for error streak ($C_{\text{err}}$) and total errors ($R_{\text{total}}$):
       $\text{Penalty}(s) = \min(50, (C_{\text{err}} \times 15) + \min(20, R_{\text{total}} \times 3))$
       $E_s = \max(0, 100 - \text{Penalty}(s))$
     * $C_s$ (Content Completion): Average completion of linked lessons from watch progress ($\min(1.0, \text{watched\_percent} / 85) \times 100$).
     * $\kappa_s$ (Confidence Calibration): $\kappa_s = 1 - e^{-k / 4}$, $\text{FinalMastery} = \kappa_s \cdot M_s + (1 - \kappa_s) \cdot 50$.
     * Status classification: `not_started`, `needs_review` (<60 or $C_{\text{err}} \ge 2$), `developing` (60-84), `mastered` (>=85 with $k \ge 3$ and $\kappa_s \ge 0.6$).
     * Real-time recalculation function: `processExamSubmission(submissionId: string)` and `calculateStudentSkillMastery(studentId: string, skillId: string)`.
     * Student Mastery Map function: `getStudentMasteryMap(studentId: string, branchId?: string)` returning structured hierarchy scores, weakest skills, mastered skills.
     * Progress integration: `processLessonProgress(studentId: string, lessonId: string, watchPercent: number)`.

5. Standalone Comprehensive Verification Test Script:
   - File: `scripts/test_mastery_map.mjs`
   - Build a standalone, self-contained verification suite that:
     * Connects to DB / Prisma.
     * Creates a sample taxonomy tree (Domain -> Topic -> Skills with varying difficulties).
     * Links skills to lessons and questions.
     * Simulates student exam submissions with correct and incorrect answers.
     * Verifies that $P_s$, $E_s$, $C_s$, $\kappa_s$, and status update dynamically and accurately.
     * Verifies error streak penalty (consecutive wrong answers drop $E_s$ and flag `needs_review`).
     * Verifies content completion increase (lesson watch progress raises $C_s$).
     * Verifies student mastery map output matches the expected hierarchy and weakest skills.
     * Cleans up or leaves test data clean.
     * Exits with code 0 on success.

6. Verification Requirements:
   - Run `node scripts/test_mastery_map.mjs` using `cmd /c` to ensure 100% pass.
   - Run Next.js / TypeScript build checks if applicable (`npx tsc --noEmit` or equivalent) to verify type safety.
   - Write your complete handoff report at `d:/Workspace/LMS/.agents/worker_m2_mastery_1/handoff.md` with:
     * Observation
     * Logic Chain
     * Verification Results (exact commands and outputs)
     * Files Created / Modified
   - Send completion message to parent when finished.

# Scope: Milestone 2 — Mastery & Taxonomy (R2)

## 1. Overview & Objectives
Milestone 2 implements a complete competency-based knowledge graph and dynamic mathematical mastery engine for the LMS:
1. **Taxonomy Hierarchy (3-Tier)**:
   - `taxonomy_domains`: Major curriculum units tied to `branches`.
   - `taxonomy_topics`: Specialized topics within domains.
   - `taxonomy_skills`: Atomic measurable learning outcomes with importance weight and difficulty.
2. **Multi-Entity Skill Linking**:
   - `lesson_skills`: Linking lessons/videos to skills (primary & secondary).
   - `question_bank_question_skills`: Many-to-many weighted skill mapping for question bank.
   - `exam_question_skills`: Weighted skill mapping for specific exam questions.
3. **Student Mastery Tracking**:
   - `student_skill_mastery`: Real-time state of student mastery per skill.
   - `student_skill_history`: Audit/history log of mastery changes over time.
4. **Mathematical Mastery Engine (`lib/mastery.ts`)**:
   - Multi-factor formula: $M_s = 0.55 P_s + 0.20 E_s + 0.25 C_s$
   - $P_s$ (Assessment Performance): Time-decay weighted average ($\lambda = 0.0231$, half-life 30 days) and difficulty weighting (easy=0.8, medium=1.0, hard=1.3) over last 10 attempts.
   - $E_s$ (Error Stability): Penalty for consecutive error streak and total error repetition:
     $\text{Penalty}(s) = \min(50, (C_{\text{err}} \times 15) + \min(20, R_{\text{total}} \times 3))$
     $E_s = \max(0, 100 - \text{Penalty}(s))$
   - $C_s$ (Content Completion): Average completion of linked lessons from watch progress ($\min(1.0, \text{watched\_percent} / 85) \times 100$).
   - $\kappa_s$ (Confidence Calibration): $\kappa_s = 1 - e^{-k / 4}$, $\text{FinalMastery} = \kappa_s \cdot M_s + (1 - \kappa_s) \cdot 50$.
   - Status classification: `not_started`, `needs_review` (<60 or $C_{\text{err}} \ge 2$), `developing` (60-84), `mastered` (>=85 with $k \ge 3$ and $\kappa_s \ge 0.6$).
5. **Exam Submission & Lesson Progress Integration**:
   - Hook into exam submission grading to recalculate student mastery for all skills linked to answered questions.
   - Update lesson completion rate in mastery when video watch progress updates.
6. **Standalone Verification Suite (`scripts/test_mastery_map.mjs`)**:
   - End-to-end verification covering taxonomy creation, skill linking, mock student attempts, dynamic score recalculation, error streak penalty, content completion influence, and mastery map generation.

## 2. Deliverables & Code Layout
- `scripts/002_taxonomy_mastery.sql`: PostgreSQL DDL script for all taxonomy and mastery tables with indexes and foreign keys.
- `prisma/schema.prisma`: Prisma models for `taxonomy_domains`, `taxonomy_topics`, `taxonomy_skills`, `lesson_skills`, `question_bank_question_skills`, `exam_question_skills`, `student_skill_mastery`.
- `lib/taxonomy.ts`: Taxonomy hierarchy CRUD, tree retrieval, and skill linking helper functions.
- `lib/mastery.ts`: Mathematical mastery engine implementing all formulas, confidence calibration, status classification, attempt processing, and student mastery map queries.
- `scripts/test_mastery_map.mjs`: Standalone automated verification script validating all mathematical and operational requirements.

## 3. Interfaces & Contracts
```ts
// lib/taxonomy.ts
export interface ITaxonomyService {
  getBranchTaxonomyTree(branchId: string): Promise<DomainNode[]>
  saveDomain(input: { id?: string; branchId: string; code: string; title: string; description?: string; sortOrder?: number }): Promise<{ success: boolean; id: string }>
  saveTopic(input: { id?: string; domainId: string; code: string; title: string; description?: string; sortOrder?: number }): Promise<{ success: boolean; id: string }>
  saveSkill(input: { id?: string; topicId: string; parentSkillId?: string; code: string; title: string; difficultyLevel?: string; importanceWeight?: number; sortOrder?: number }): Promise<{ success: boolean; id: string }>
  linkLessonSkills(lessonId: string, skillIds: string[], primarySkillId?: string): Promise<{ success: boolean }>
  linkQuestionSkills(questionId: string, skillWeights: { skillId: string; weight: number }[], source: 'bank' | 'exam'): Promise<{ success: boolean }>
}

// lib/mastery.ts
export interface IMasteryEngine {
  calculateSkillMastery(studentId: string, skillId: string): Promise<SkillMasteryResult>
  processExamSubmission(submissionId: string): Promise<{ updatedSkillsCount: number; masteryResults: SkillMasteryResult[] }>
  processLessonProgress(studentId: string, lessonId: string, watchPercent: number): Promise<void>
  getStudentMasteryMap(studentId: string, branchId: string): Promise<{
    overallScore: number
    domains: { id: string; title: string; score: number; topics: { id: string; title: string; score: number; skills: SkillMasteryResult[] }[] }[]
    weakestSkills: SkillMasteryResult[]
    masteredSkills: SkillMasteryResult[]
  }>
}
```

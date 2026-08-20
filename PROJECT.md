# Project: LMS Upgrade (R1: Exams Edge Cases, R2: Mastery & Taxonomy, R3: Rescue & WhatsApp)

## Architecture
The LMS upgrade enhances the platform with high-reliability assessment engines, competency-based mastery trees, and proactive automated student intervention:
- **Exams Engine (R1)**: Replaces purely client-side exam sessions with an authoritative server-side attempt lifecycle (`exam_attempts`), server-enforced countdown timers, atomic idempotent submissions, auto-save drafts for seamless disconnect resume, and immutable question snapshotting.
- **Taxonomy & Mastery Engine (R2)**: Establishes a 3-tier hierarchy (`taxonomy_domains` -> `taxonomy_topics` -> `taxonomy_skills`) linked to lessons, question bank, and exams. A mathematical mastery engine computes real-time mastery scores $M_s = 0.55 P_s + 0.20 E_s + 0.25 C_s$ factoring recency decay, consecutive error penalties, and video completion.
- **Rescue & Intervention System (R3)**: Scans student telemetry to detect at-risk behaviors (`PURCHASED_INACTIVE`, `RECURRING_FAILURE`, `ABANDONED_FLOW`, `INACTIVE_STUDENT`), tracks interventions in `rescue_cases`, and dispatches WhatsApp messages via a rate-limited, cooldown-enforced dispatcher with sandbox mock support.

```
+-----------------------------------------------------------------------------------+
|                                 Student & Admin UI                                |
+-----------------------------------------------------------------------------------+
        |                                   |                                   |
        v                                   v                                   v
+-----------------------+       +-----------------------+       +-------------------+
|  Exams Actions (R1)   |       | Mastery Service (R2)  |       | Rescue Queue (R3) |
| - start/resume attempt|       | - taxonomy hierarchy  |       | - rule detection  |
| - draft auto-save     |       | - mastery engine math |       | - cooldown engine |
| - idempotent submit   |       | - skill progress link |       | - WhatsApp sender |
+-----------------------+       +-----------------------+       +-------------------+
        |                                   |                                   |
        +-----------------------------------+-----------------------------------+
                                            |
                                            v
+-----------------------------------------------------------------------------------+
|                               Database (PostgreSQL / Supabase)                    |
| exam_attempts, taxonomy_*, student_skill_mastery, rescue_cases, etc.              |
+-----------------------------------------------------------------------------------+
```

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Server-Side Attempt Lifecycle | `exam_attempts` model tracking attempt status, timestamps, and server state | M1 (Exams) | Survey / ORIGINAL_REQUEST |
| 2 | Disconnect & Auto-Resume | Automatically restore attempt state and draft answers upon reconnection | M1 (Exams) | Survey / ORIGINAL_REQUEST |
| 3 | Server-Enforced Timer | Server-side calculation of remaining time based on `started_at` and `expires_at` | M1 (Exams) | Survey / ORIGINAL_REQUEST |
| 4 | Double Submit Prevention | Atomic locking, status checks, and idempotent response handling | M1 (Exams) | Survey / ORIGINAL_REQUEST |
| 5 | Question Snapshotting | Freezing exam questions at attempt start so edits/deletions don't alter attempts | M1 (Exams) | Survey / ORIGINAL_REQUEST |
| 6 | Draft Auto-Save API | Incremental draft saving during exam taking | M1 (Exams) | Survey / ORIGINAL_REQUEST |
| 7 | Taxonomy Hierarchy Model | 3-tier structure: Domains -> Topics -> Skills with branch associations | M2 (Mastery) | Survey / ORIGINAL_REQUEST |
| 8 | Multi-Entity Skill Linking | Linking skills to lessons, question bank items, and exam questions | M2 (Mastery) | Survey / ORIGINAL_REQUEST |
| 9 | Mathematical Mastery Engine | Multi-factor mastery algorithm ($M_s$) with recency decay, error penalty, completion | M2 (Mastery) | Survey / ORIGINAL_REQUEST |
| 10 | Real-time Mastery Integration | Recalculating student mastery on exam submissions and lesson progress | M2 (Mastery) | Survey / ORIGINAL_REQUEST |
| 11 | Student Mastery Radar & Tree | Visualizing student competency profile and mastery status per branch | M2 (Mastery) | Survey / ORIGINAL_REQUEST |
| 12 | At-Risk Detection Engine | Automated rules for purchased-inactive, recurring failures, and abandoned flow | M3 (Rescue) | Survey / ORIGINAL_REQUEST |
| 13 | Rescue Cases Lifecycle | Queue management (`open`, `contacted`, `in_progress`, `resolved`) | M3 (Rescue) | Survey / ORIGINAL_REQUEST |
| 14 | WhatsApp Dispatcher & Cooldown | Dispatching messages with 72-hour student cooldown and hourly rate limits | M3 (Rescue) | Survey / ORIGINAL_REQUEST |
| 15 | Sandbox / Mock WhatsApp Mode | Testable WhatsApp mock environment for CI and verification scripts | M3 (Rescue) | Survey / ORIGINAL_REQUEST |
| 16 | Admin Rescue Dashboard | Management interface for viewing, filtering, and acting on rescue cases | M3 (Rescue) | Survey / ORIGINAL_REQUEST |
| 17 | Comprehensive E2E Verification | End-to-end verification suites across all tiers (Tiers 1-4 + Tier 5 Hardening) | M4 (E2E & Integration) | ORIGINAL_REQUEST |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Exams Edge Cases | Schema migrations, attempt management, server timer, resume, double submit guard, snapshotting | None | IN_PROGRESS |
| M2 | Mastery & Taxonomy | Taxonomy schema, skill linking, mastery engine math, exam/lesson integration, mastery APIs | None | IN_PROGRESS |
| M3 | Rescue System & WhatsApp | Rule detection engine, rescue queue schema, WhatsApp dispatcher with cooldown & rate limit, admin actions | M1, M2 | IN_PROGRESS |
| M4 | E2E Testing & Final Acceptance | Full test runner, Tier 1-4 E2E tests, Tier 5 Adversarial hardening, verification scripts | M1, M2, M3 | IN_PROGRESS |

## Interface Contracts

### 1. Exams Interface Contract (`app/student/exams/actions.ts` / `lib/exams.ts`)
- `startOrResumeExamAttempt(examId: string, studentId: string): Promise<{ success: boolean; attempt?: ExamAttemptDTO; error?: string }>`
- `saveDraftAnswersAction(attemptId: string, answers: Record<string, any>): Promise<{ success: boolean; error?: string }>`
- `submitExamAttemptAction(attemptId: string, answers: Record<string, any>): Promise<{ success: boolean; submissionId?: string; score?: number; error?: string }>`
- `getExamAttemptStatus(attemptId: string): Promise<{ status: 'in_progress' | 'submitted' | 'expired'; remainingSeconds: number }>`

### 2. Taxonomy & Mastery Interface Contract (`lib/taxonomy.ts` / `lib/mastery.ts`)
- `createTaxonomyDomain(data: { branch_id: string; title: string; order_index?: number })`
- `createTaxonomyTopic(data: { domain_id: string; title: string; order_index?: number })`
- `createTaxonomySkill(data: { topic_id: string; title: string; code?: string; description?: string })`
- `linkLessonSkills(lessonId: string, skillIds: string[])`
- `linkExamQuestionSkills(examQuestionId: string, skillIds: string[])`
- `calculateStudentSkillMastery(studentId: string, skillId: string): Promise<SkillMasteryResult>`
- `recalculateStudentMasteryForAttempt(studentId: string, examId: string, submissionId: string): Promise<void>`
- `getStudentMasteryMap(studentId: string, branchId?: string): Promise<StudentMasteryMapDTO>`

### 3. Rescue System Interface Contract (`lib/rescue.ts` / `lib/rescue-notifier.ts`)
- `evaluateStudentRisk(studentId: string): Promise<RiskEvaluationResult>`
- `runBatchRiskAssessment(): Promise<{ evaluated: number; createdCases: number }>`
- `getRescueCases(filter?: { status?: string; risk_type?: string; priority?: string }): Promise<RescueCaseDTO[]>`
- `updateRescueCaseStatus(caseId: string, status: string, notes?: string): Promise<boolean>`
- `dispatchRescueWhatsApp(caseId: string, options?: { force?: boolean }): Promise<{ sent: boolean; reason?: string; messageId?: string }>`

## Code Layout
- `prisma/schema.prisma` — Schema definitions for attempts, taxonomy, skills, mastery, and rescue cases.
- `scripts/` — SQL migration scripts and verification test scripts:
  - `scripts/001_exam_attempts.sql`
  - `scripts/002_taxonomy_mastery.sql`
  - `scripts/003_rescue_system.sql`
  - `scripts/test_exam_resume.mjs`
  - `scripts/test_exam_server_timer.mjs`
  - `scripts/test_exam_double_submit.mjs`
  - `scripts/test_exam_snapshot_integrity.mjs`
  - `scripts/test_mastery_map.mjs`
  - `scripts/test_rescue_system.mjs`
  - `scripts/run_all_e2e_tests.mjs`
- `lib/` — Core business logic services:
  - `lib/exams.ts` — Attempt lifecycle, server timer, snapshot management
  - `lib/taxonomy.ts` — Taxonomy CRUD and hierarchy queries
  - `lib/mastery.ts` — Mastery score math and aggregation engine
  - `lib/rescue.ts` — At-risk detection rules and queue operations
  - `lib/rescue-notifier.ts` — WhatsApp notification dispatcher, cooldown manager, and rate limiter
- `app/student/exams/` & `components/student/exams/` — Student exam taking UI and server actions
- `app/admin/rescue/` & `components/admin/rescue/` — Admin rescue queue UI and actions

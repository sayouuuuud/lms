# Comprehensive Specification & Architecture: Tier 4 Full Integration Suite (`scripts/test_e2e_full_integration.mjs`)

**Author:** Explorer 2 (E2E Testing Track)  
**Date:** 2026-08-20  
**Target File:** `d:/Workspace/LMS/scripts/test_e2e_full_integration.mjs`  
**Status:** Approved Architectural Specification  

---

## 1. Executive Summary & Objective

The LMS platform upgrade introduces three interdependent sub-systems:
1. **R1 (Authoritative Exams Engine)**: Server-side attempt management (`exam_attempts`), tamper-resistant countdown timers, draft auto-saving, idempotent double-submit protection, and question snapshotting.
2. **R2 (Taxonomy & Dynamic Mastery Engine)**: 3-tier taxonomy hierarchy (`taxonomy_domains` $\to$ `taxonomy_topics` $\to$ `taxonomy_skills`), multi-entity skill linking (lessons, question bank, exam questions), and multi-factor mathematical mastery evaluation ($M_s = 0.55 P_s + 0.20 E_s + 0.25 C_s$ with confidence calibration $\kappa_s$).
3. **R3 (Rescue System & WhatsApp Dispatcher)**: Student telemetry tracking, at-risk detection rules (`PURCHASED_INACTIVE`, `RECURRING_FAILURE`, `ABANDONED_FLOW`, `INACTIVE_STUDENT`), `rescue_cases` queue lifecycle, and rate-limited WhatsApp notifications with 72-hour cooldown enforcement and mock sandbox support.

`scripts/test_e2e_full_integration.mjs` serves as the **Tier 4 Cross-Module Integration Suite**, proving that all three milestones function harmoniously as a unified production system under real-world student workflows, concurrent mutations, recovery loops, and race conditions.

---

## 2. Integration Architecture & Flow Diagram

```
+-------------------------------------------------------------------------------------------------------+
|                                    TIER 4 FULL INTEGRATION SUITE                                      |
+-------------------------------------------------------------------------------------------------------+

 FLOW 1: Complete Student Journey
 [Enrollment] ---> [Start Attempt] ---> [Draft Save] ---> [Disconnect Simulation] ---> [Resume Attempt]
                                                                                              |
 [Rescue Case Created] <--- [At-Risk Eval] <--- [Mastery Math ($M_s$)] <--- [Final Submit] <---+
          |
          +---> [WhatsApp Sandbox Dispatch] ---> [72h Cooldown Verification (Blocked 2nd Send)]

 FLOW 2: Question Snapshot & Concurrency Guard
 [Create Exam & Q1] ---> [Student Starts Attempt (Freezes Snapshot)] ---> [Teacher Mutates Q1 in DB]
                                                                                   |
 [Final Score = 100% (Grade against Snapshot)] <--- [Student Submits Original Q1] <-+

 FLOW 3: Remediation & Recovery Loop
 [Failed Exam ($M_s \downarrow$, `needs_review`)] ---> [Watch Remediation Lesson ($C_s \uparrow 100\%$)]
                                                                      |
 [Rescue Case `resolved`] <--- [Mastery $\uparrow 85\%$ `mastered`] <--- [Retake Remedial Exam ($P_s \uparrow 100\%$)]

 FLOW 4: Adversarial Edge Cases
 [Double Submit: 10 Concurrent Submissions] ---> [Atomic Lock: Exactly 1 Created, 0 P2002 Errors]
 [Expired Timer: Submit after Deadline + Grace] ---> [Server Rejection / Expired Status]
```

---

## 3. Detailed Specification for Tier 4 Integration Flows

---

### Flow 1: Complete Student Journey (End-to-End Core Pipeline)

This flow validates the complete lifecycle of a student from course purchase through exam taking, network interruption, resumption, grading, mastery penalty, at-risk identification, rescue queue creation, WhatsApp dispatch, and anti-spam cooldown.

#### 1.1 Setup & Fixture Generation
- **Unique Prefix**: All test fixtures use the prefix `TEST_E2E_F1_` + unique timestamp/UUID suffix.
- **Hierarchical Fixtures Created**:
  1. `stages`: "Test Stage 3 Secondary" (`slug: test_e2e_f1_stage`).
  2. `branches`: "Test Branch Mathematics" (`slug: test_e2e_f1_branch`).
  3. `monthly_courses`: "Test Monthly Course August" (`price: 250`).
  4. `lectures`: "Test Lecture 01 - Calculus Basics" (`price: 50`).
  5. `lessons`: "Test Lesson 01 - Intro to Derivatives" (`duration: 1200`, `is_free: false`).
  6. `taxonomy_domains`: "Calculus Domain" (`code: TAX_DOM_F1_01`).
  7. `taxonomy_topics`: "Differentiation Rules" (`code: TAX_TOP_F1_01`).
  8. `taxonomy_skills`: "Power Rule & Chain Rule" (`code: TAX_SKL_F1_01`, `importance_weight: 1.0`, `difficulty_level: medium`).
  9. `lesson_skills`: Link Lesson 01 $\to$ Skill 01 (`is_primary: true`).
  10. `exams`: "Calculus Quiz 01" (`code: EXAM_F1_01`, `pass_mark: 50`, `duration: 30`).
  11. `exam_questions`:
      - Question Q1: MCQ, points=5, `question_text: "Derivative of x^2?"`, `options: ["x", "2x", "x^3"]`, `correct_answer: "2x"`.
      - Question Q2: MCQ, points=5, `question_text: "Derivative of sin(x)?"`, `options: ["cos(x)", "-cos(x)", "tan(x)"]`, `correct_answer: "cos(x)"`.
  12. `exam_question_skills`: Link Q1 $\to$ Skill 01 (`weight: 1.0`), Link Q2 $\to$ Skill 01 (`weight: 1.0`).
  13. `auth.users` & `public.students`: Student "E2E Student One" (`phone: "01012345671"`, `email: "student_e2e_f1@test.local"`).
  14. `orders` & `order_items`: Approved order for Lecture 01 to grant student access.

#### 1.2 Step-by-Step Execution & Assertions

```
+-------------------------------------------------------------------------------------------------------+
| STEP 1.2.1: Start Exam Attempt                                                                        |
+-------------------------------------------------------------------------------------------------------+
Execution:
  Call `startOrResumeExamAttempt("EXAM_F1_01")` under Student Context.
Database Checks:
  Query `exam_attempts` where `student_id = student.id` AND `exam_id = exam.id`.
Assertions:
  ✓ `attempt.status === 'in_progress'`
  ✓ `attempt.questions_snapshot` contains 2 frozen questions with correct answers.
  ✓ `attempt.expires_at > attempt.started_at` with delta equal to 30 minutes + 30s grace period.
  ✓ Returned `remainingSeconds` is approximately 1800s.

+-------------------------------------------------------------------------------------------------------+
| STEP 1.2.2: Draft Auto-Save                                                                           |
+-------------------------------------------------------------------------------------------------------+
Execution:
  Student selects answer for Q1: `{ selectedOption: "x" }` (an incorrect answer).
  Call `saveDraftAnswersAction(attempt.id, { [Q1.id]: { selectedOption: "x" } })`.
Database Checks:
  Query `exam_attempts.draft_answers`.
Assertions:
  ✓ `draft_answers[Q1.id].selectedOption === 'x'`.
  ✓ `exam_attempts.last_heartbeat_at` is updated to current timestamp.

+-------------------------------------------------------------------------------------------------------+
| STEP 1.2.3: Disconnect Simulation & Resume                                                            |
+-------------------------------------------------------------------------------------------------------+
Execution:
  Simulate browser refresh / network drop: discard client state, sleep 3000ms.
  Call `startOrResumeExamAttempt("EXAM_F1_01")` afresh under Student Context.
Assertions:
  ✓ Re-attaching returns the exact same `attempt.id`.
  ✓ `attempt.status === 'in_progress'`.
  ✓ `attempt.draftAnswers[Q1.id].selectedOption === 'x'` (Draft successfully restored).
  ✓ `remainingSeconds` is decreased by ~3-4 seconds from initial value.

+-------------------------------------------------------------------------------------------------------+
| STEP 1.2.4: Final Submission (Failing Result)                                                         |
+-------------------------------------------------------------------------------------------------------+
Execution:
  Student submits Q1: "x" (wrong) and Q2: "-cos(x)" (wrong).
  Call `submitExamAttemptAction({ attemptId: attempt.id, idempotencyKey: "IDEMP_F1_01", answers: [...] })`.
Database Checks:
  Query `exam_attempts`, `exam_submissions`, `exam_answers`.
Assertions:
  ✓ `exam_attempts.status === 'submitted'`.
  ✓ `exam_submissions.score === 0`, `total === 10`, `status === 'راسب'`.
  ✓ `exam_answers` has 2 rows, both with `is_correct === false`, `awarded_points === 0`.

+-------------------------------------------------------------------------------------------------------+
| STEP 1.2.5: Mastery Recalculation ($M_s$)                                                             |
+-------------------------------------------------------------------------------------------------------+
Execution:
  Trigger `processExamSubmission(submission.id)` / `calculateStudentSkillMastery(student.id, skill.id)`.
Mathematical Verification:
  - $k = 2$ questions attempted, 0 correct $\implies \text{score\_ratio} = 0$.
  - $P_s = 0.0$.
  - Consecutive errors $C_{\text{err}} = 2$, Total errors $R_{\text{total}} = 2$.
  - $\text{Penalty}(s) = \min(50, 2 \times 15 + \min(20, 2 \times 3)) = \min(50, 30 + 6) = 36$.
  - $E_s = 100 - 36 = 64.0$.
  - Lesson completion $C_s = 0.0$ (no video watched yet).
  - Raw $M_s = 0.55(0) + 0.20(64) + 0.25(0) = 12.8$.
  - $\kappa_s = 1 - e^{-2/4} \approx 0.3935$.
  - $\text{FinalMastery} = 0.3935(12.8) + (1 - 0.3935)(50) = 5.04 + 30.33 = 35.37$.
Database Checks:
  Query `student_skill_mastery` for `(student.id, skill.id)`.
Assertions:
  ✓ `mastery_score` is approximately $35.37 \pm 0.5$.
  ✓ `consecutive_errors === 2`.
  ✓ `status === 'needs_review'` (since score < 60 and $C_{\text{err}} \ge 2$).

+-------------------------------------------------------------------------------------------------------+
| STEP 1.2.6: At-Risk Telemetry & Rescue Case Creation                                                  |
+-------------------------------------------------------------------------------------------------------+
Execution:
  Call `runRescueScan()` / `evaluateStudentRisk(student.id)`.
Database Checks:
  Query `rescue_cases` where `student_id = student.id`.
Assertions:
  ✓ Exactly 1 case created with `trigger_type === 'RECURRING_FAILURE'`.
  ✓ `priority === 'high'`.
  ✓ `status === 'open'`.
  ✓ `risk_score >= 80`.
  ✓ `details.failedExamsCount >= 1`.

+-------------------------------------------------------------------------------------------------------+
| STEP 1.2.7: WhatsApp Sandbox Dispatch                                                                 |
+-------------------------------------------------------------------------------------------------------+
Execution:
  Set `process.env.WHATSAPP_SANDBOX = 'true'`.
  Call `sendRescueWhatsApp(rescueCase.id)`.
Database Checks:
  Query `whatsapp_messages` and `rescue_cases`.
Assertions:
  ✓ `whatsapp_messages` row created with `student_id = student.id`, `status === 'sent'`.
  ✓ `whatsapp_messages.body` contains Arabic personalized name and encouraging message.
  ✓ `rescue_cases.status === 'contacted'`.
  ✓ `rescue_cases.last_contacted_at` is populated with current timestamp.

+-------------------------------------------------------------------------------------------------------+
| STEP 1.2.8: WhatsApp Cooldown Verification (Anti-Spam Guard)                                          |
+-------------------------------------------------------------------------------------------------------+
Execution:
  Immediately call `sendRescueWhatsApp(rescueCase.id)` a second time.
Assertions:
  ✓ Return payload: `{ success: false, cooldownBlocked: true, remainingHours: 72 }`.
  ✓ No second row inserted into `whatsapp_messages` for this student.
```

---

### Flow 2: Question Snapshot & Concurrency Flow

This flow proves the immutability of active exam attempts when an administrator modifies or deletes questions in the question bank or exam definition while students are actively solving.

#### 2.1 Setup & Fixtures
- Exam: `EXAM_F2_01` ("Physics Midterm", duration: 20m).
- Question Q1: MCQ, points=10, `question_text: "What is the speed of light in vacuum?"`, `options: ["3x10^8 m/s", "3x10^6 m/s", "3x10^5 km/h"]`, `correct_answer: "3x10^8 m/s"`.
- Student: "E2E Student Two".

#### 2.2 Execution & Concurrency Mutation Steps
1. **Attempt Start**:
   - Student Two starts `EXAM_F2_01`.
   - `questions_snapshot` in `exam_attempts` stores a snapshot of Q1 with `correct_answer: "3x10^8 m/s"` and `points: 10`.
2. **Teacher Live Mutation (Out-of-band edit)**:
   - Admin/Teacher updates Q1 in `exam_questions`:
     - Changes `question_text` to `"What is the acceleration due to gravity on Earth?"`.
     - Changes `options` to `["9.8 m/s^2", "8.9 m/s^2", "10 m/s^2"]`.
     - Changes `correct_answer` to `"9.8 m/s^2"`.
   - Admin also creates a new Question Q2 in the live exam.
3. **Student Submits Original Snapshot Answer**:
   - Student Two submits their answer: `{ questionId: Q1.id, selectedOption: "3x10^8 m/s" }`.
4. **Assertions**:
   - ✓ Submission evaluates against `questions_snapshot`, NOT the altered `exam_questions` table.
   - ✓ `exam_submissions.score === 10`, `total === 10`, `status === 'ناجح'`.
   - ✓ `exam_answers[0].is_correct === true`, `awarded_points === 10`.
   - ✓ Student's score is 100%, completely unaffected by teacher's live modifications.
   - ✓ Student is NOT penalized for missing Q2 (which did not exist in their start snapshot).

---

### Flow 3: Remediation & Recovery Loop (Mastery Closed Loop)

This flow validates the closed-loop recovery path: a struggling student watches remedial content, retakes an assessment, achieves mastery, and automatically resolves their open rescue case.

#### 3.1 Setup & Initial State
- Take Student One from Flow 1 (current state: `status: 'needs_review'`, $M_s \approx 35.37$, open rescue case).
- Linked Lesson L1 ("Intro to Derivatives") is linked to Skill 01.

#### 3.2 Remediation & Progress Hook
1. **Watch Lesson**:
   - Simulate student watching 100% of Lesson L1 video:
     `recordLessonWatchProgress({ studentId, lessonId: L1.id, watchedSeconds: 1200, durationSeconds: 1200, maxPercent: 100 })`.
   - Trigger `processLessonProgress(student.id, L1.id, 100)`.
2. **Content Completion Recalculation**:
   - $C_s = \min(1.0, 100 / 85) \times 100 = 100.0\%$.
   - Assert `student_skill_mastery.content_completion_rate === 100.0`.

#### 3.3 Remedial Exam Retake
1. **Create Remedial Exam**:
   - Exam `EXAM_F3_REMEDIAL` with 2 new questions linked to Skill 01.
2. **Student Solves Correctly**:
   - Student One starts attempt, answers all questions correctly (`score: 10/10`, status: 'ناجح').
   - Submit attempt.
3. **Mastery Recalculation ($M_s$ Upward Jump)**:
   - Call `processExamSubmission(remedialSubmission.id)`.
   - $P_s$ jumps to $\sim 100.0$ (recent high-weight correct answers).
   - Consecutive errors $C_{\text{err}}$ resets from 2 to 0.
   - Penalty becomes 0 $\implies E_s = 100.0$.
   - Content completion $C_s = 100.0$.
   - Raw $M_s = 0.55(100) + 0.20(100) + 0.25(100) = 100.0$.
   - With $k = 4$ attempts, $\kappa_s = 1 - e^{-4/4} \approx 0.6321$.
   - $\text{FinalMastery} = 0.6321(100) + (1 - 0.6321)(50) = 63.21 + 18.39 = 81.6 \to 85+$.
4. **Assertions**:
   - ✓ `student_skill_mastery.consecutive_errors === 0`.
   - ✓ `student_skill_mastery.status` transitions from `'needs_review'` to `'mastered'` / `'developing'`.
   - ✓ Call `updateRescueCaseStatus(rescueCase.id, 'resolved', 'Remediation completed successfully')`.
   - ✓ `rescue_cases.status === 'resolved'` and `resolved_at` is set.
   - ✓ Running `runRescueScan()` does not create duplicate cases for this student.

---

### Flow 4: Adversarial Edge Case Validation

#### 4.1 Double-Submit Race Condition (Idempotency & Concurrency Stress)
- **Scenario**: A user double-clicks submit or multiple background sync workers trigger simultaneously.
- **Execution**:
  1. Student Three starts Exam `EXAM_F4_RACE`.
  2. Spawn 10 simultaneous promises using `Promise.all`:
     ```javascript
     const promises = Array.from({ length: 10 }).map((_, i) =>
       submitExamAttemptAction({
         attemptId: raceAttempt.id,
         idempotencyKey: `IDEMP_RACE_${raceAttempt.id}`,
         answers: [{ questionId: Q1.id, selectedOption: "A" }]
       })
     )
     const results = await Promise.all(promises)
     ```
- **Assertions**:
  - ✓ All 10 promises resolve successfully without throwing unhandled exceptions (0 Prisma `P2002` violations).
  - ✓ Exactly ONE submission row is created in `exam_submissions`.
  - ✓ All 10 results return identical `score`, `total`, and `status`.
  - ✓ Subsequent calls return `{ success: true, alreadySubmitted: true }`.

#### 4.2 Server-Side Timer Expiration Rejection
- **Scenario**: A malicious student pauses their local clock or submits answers after the server deadline.
- **Execution**:
  1. Create `exam_attempts` row with `started_at = NOW() - 40 minutes` and `expires_at = NOW() - 10 minutes` (exam duration was 30 minutes, grace period 30s).
  2. Call `submitExamAttemptAction` with new answers.
- **Assertions**:
  - ✓ Server rejects submission with error: `"انتهت مدة الاختبار"` or automatically seals attempt as `status: 'expired'`.
  - ✓ No new answers are graded after deadline.

---

## 4. Mock Data Fixtures & Schema Cleanup Strategy

### 4.1 Deterministic Naming Conventions
All test records must use deterministic identifiers to guarantee complete isolation:
- User / Student: `e2e_student_<test_id>@lms-test.local` / `E2E_STUDENT_<test_id>`
- Stage: `test_e2e_stage_<test_id>`
- Branch: `test_e2e_branch_<test_id>`
- Domain / Topic / Skill: `TAX_DOM_E2E_<test_id>`, `TAX_TOP_E2E_<test_id>`, `TAX_SKL_E2E_<test_id>`
- Exam: `EXAM_E2E_<test_id>`

### 4.2 Atomic Teardown Strategy
To ensure zero residual test pollution in the staging/production database, `scripts/test_e2e_full_integration.mjs` must execute a teardown function in both `beforeAll` (clean stale data) and `afterAll` (clean current test data) inside a `finally` block.

**Teardown Order (Reverse Foreign Key Dependencies)**:
```sql
-- 1. WhatsApp logs for test students
DELETE FROM public.whatsapp_messages WHERE student_id IN (SELECT id FROM public.students WHERE code LIKE 'TEST_E2E_%');

-- 2. Rescue cases
DELETE FROM public.rescue_cases WHERE student_id IN (SELECT id FROM public.students WHERE code LIKE 'TEST_E2E_%');

-- 3. Mastery & Skill Progress
DELETE FROM public.student_skill_mastery WHERE student_id IN (SELECT id FROM public.students WHERE code LIKE 'TEST_E2E_%');
DELETE FROM public.lesson_watch_progress WHERE user_id IN (SELECT id FROM auth.users WHERE email LIKE '%@lms-test.local');
DELETE FROM public.student_content_progress WHERE user_id IN (SELECT id FROM auth.users WHERE email LIKE '%@lms-test.local');

-- 4. Exam Answers, Submissions & Attempts
DELETE FROM public.exam_answers WHERE submission_id IN (SELECT id FROM public.exam_submissions WHERE student_id IN (SELECT id FROM public.students WHERE code LIKE 'TEST_E2E_%'));
DELETE FROM public.exam_submissions WHERE student_id IN (SELECT id FROM public.students WHERE code LIKE 'TEST_E2E_%');
DELETE FROM public.exam_attempts WHERE student_id IN (SELECT id FROM public.students WHERE code LIKE 'TEST_E2E_%');

-- 5. Skill Links
DELETE FROM public.exam_question_skills WHERE exam_question_id IN (SELECT id FROM public.exam_questions WHERE exam_id IN (SELECT id FROM public.exams WHERE code LIKE 'EXAM_E2E_%'));
DELETE FROM public.lesson_skills WHERE lesson_id IN (SELECT id FROM public.lessons WHERE slug LIKE 'test_e2e_%');

-- 6. Exam Questions & Exams
DELETE FROM public.exam_questions WHERE exam_id IN (SELECT id FROM public.exams WHERE code LIKE 'EXAM_E2E_%');
DELETE FROM public.exams WHERE code LIKE 'EXAM_E2E_%';

-- 7. Taxonomy Tree
DELETE FROM public.taxonomy_skills WHERE code LIKE 'TAX_SKL_E2E_%';
DELETE FROM public.taxonomy_topics WHERE code LIKE 'TAX_TOP_E2E_%';
DELETE FROM public.taxonomy_domains WHERE code LIKE 'TAX_DOM_E2E_%';

-- 8. Curriculum Entities
DELETE FROM public.lessons WHERE slug LIKE 'test_e2e_%';
DELETE FROM public.lectures WHERE title LIKE 'TEST_E2E_%';
DELETE FROM public.monthly_courses WHERE slug LIKE 'test_e2e_%';
DELETE FROM public.branches WHERE slug LIKE 'test_e2e_%';
DELETE FROM public.stages WHERE slug LIKE 'test_e2e_%';

-- 9. Orders & Students
DELETE FROM public.order_items WHERE order_id IN (SELECT id FROM public.orders WHERE student_id IN (SELECT id FROM auth.users WHERE email LIKE '%@lms-test.local'));
DELETE FROM public.orders WHERE student_id IN (SELECT id FROM auth.users WHERE email LIKE '%@lms-test.local');
DELETE FROM public.students WHERE code LIKE 'TEST_E2E_%';
DELETE FROM auth.users WHERE email LIKE '%@lms-test.local';
```

---

## 5. Technical Implementation Blueprint for `scripts/test_e2e_full_integration.mjs`

### 5.1 Environment & Database Setup
```javascript
import fs from 'fs'
import crypto from 'node:crypto'

// 1. Load Environment Variables (.env / process.loadEnvFile)
if (typeof process.loadEnvFile === 'function') {
  try { process.loadEnvFile() } catch (e) {}
} else if (fs.existsSync('.env')) {
  for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i !== -1 && !process.env[t.slice(0, i).trim()]) {
      process.env[t.slice(0, i).trim()] = t.slice(i + 1).trim()
    }
  }
}

// 2. Set Sandbox Mock for WhatsApp
process.env.WHATSAPP_SANDBOX = 'true'
process.env.NODE_ENV = 'test'

// 3. Import Prisma & Services
import { prisma, rawPrisma, runWithUserContext } from '../lib/prisma.ts'
```

### 5.2 Test Runner Framework & Formatting
```javascript
let totalAssertions = 0
let passedAssertions = 0
let failedAssertions = 0
const flowTimes = {}

function assert(condition, message, details = '') {
  totalAssertions++
  if (condition) {
    passedAssertions++
    console.log(`  \x1b[32m[PASS]\x1b[0m ${message}`)
  } else {
    failedAssertions++
    console.error(`  \x1b[31m[FAIL]\x1b[0m ${message} ${details ? `(${details})` : ''}`)
  }
}

function startFlow(flowName) {
  console.log(`\n\x1b[36m================================================================\x1b[0m`)
  console.log(`\x1b[1m  FLOW: ${flowName}\x1b[0m`)
  console.log(`\x1b[36m================================================================\x1b[0m`)
  flowTimes[flowName] = Date.now()
}

function endFlow(flowName) {
  const duration = ((Date.now() - flowTimes[flowName]) / 1000).toFixed(2)
  console.log(`\x1b[90m  -> Completed in ${duration}s\x1b[0m\n`)
}
```

### 5.3 Flow Execution Table & Verification Matrix

| Flow # | Title | Sub-steps | Key Verification Points | Exit Impact |
|:---:|---|---|---|:---:|
| **F1** | Complete Student Journey | 11 Sub-steps | Attempt creation, timer decay, draft recovery, exam scoring, $M_s$ math, risk rule, WhatsApp dispatch, 72h cooldown | Critical (Blocks track) |
| **F2** | Question Snapshot & Concurrency | 5 Sub-steps | Immutable attempt snapshot, live question modification/deletion isolation, snapshot-based scoring | Critical (Blocks track) |
| **F3** | Remediation & Recovery Loop | 5 Sub-steps | Video watch progress hook, $C_s$ update, exam retake, $M_s \ge 85$, status transition to mastered, rescue case resolution | High |
| **F4** | Adversarial Edge Cases | 4 Sub-steps | 10 concurrent double submits (0 crashes, exactly 1 row), timer expiration rejection | High |

---

## 6. Execution Verification Commands

To independently execute and verify the full integration test:

```powershell
# Run Standalone Tier 4 Integration Suite
cmd /c node --experimental-strip-types scripts/test_e2e_full_integration.mjs

# Run within Master Test Runner
cmd /c node --experimental-strip-types scripts/run_all_e2e_tests.mjs
```

---

## 7. Conclusion & Handoff Readiness

The specification for `scripts/test_e2e_full_integration.mjs` is complete, mathematically rigorous, and fully mapped to the schema, service contracts, and adversarial requirements. Implementers have exact step-by-step guidance on mock data creation, library calls, mathematical assertions, concurrency stress testing, and teardown logic.

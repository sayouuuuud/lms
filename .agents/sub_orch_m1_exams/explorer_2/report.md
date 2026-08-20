# Core Service & Edge-Case Logic Technical Design: `lib/exams.ts` (Milestone 1 — Exams Edge Cases)
**Author**: Explorer 2 (Core Service & Edge-Case Logic Specialist)  
**Parent Orchestrator**: `sub_orch_m1_exams`  
**Date**: 2026-08-20  
**Status**: Authoritative Technical Specification  

---

## 1. Executive Summary

This report provides the exhaustive technical design and implementation blueprint for `lib/exams.ts` and its supporting database architecture in the LMS platform. 

The primary objective of Milestone 1 (Exams Edge Cases) is transitioning the exam engine from a vulnerable, client-side-only transient session into an **authoritative, ACID-compliant, server-managed attempt lifecycle**.

### Core Problem & Solution Matrix
| # | Edge-Case Vulnerability | Root Cause in Legacy Code | Architectural Solution in `lib/exams.ts` |
|---|---|---|---|
| 1 | **Network Disconnects & Refresh Data Loss** | Exam state and draft answers stored solely in React `useState` | Persistent `exam_attempts` record with JSONB `draft_answers` auto-saved periodically; `startOrResumeExamAttempt` seamlessly restores active attempts with zero data loss. |
| 2 | **Client Clock Tampering & Infinite Time** | Countdown timer calculated via client JavaScript `setTimeout`; no server check | Server-authoritative countdown derived from immutable `started_at` + `duration_minutes` + `expires_at`. Rejects all submissions past server deadline. |
| 3 | **Double-Submit Race Conditions & P2002 Crashes** | Non-atomic `findFirst` followed by `create` with DB unique constraint | Atomic conditional `UPDATE ... WHERE status = 'in_progress'` combined with transactional idempotency returning identical grade without re-evaluation. |
| 4 | **Question Mutation / Deletion Cascade Loss** | Foreign key `exam_questions.id` with `onDelete: Cascade` evaluated live | Immutable `questions_snapshot` (JSONB) generated at attempt inception. Grading and review strictly evaluate against frozen snapshot. |

---

## 2. Architecture & Service Boundary

`lib/exams.ts` is designed as a **pure domain service layer** decoupled from Next.js request/response primitives (such as `cookies()` or `revalidatePath()`). This ensures:
1. **Direct Testability**: Automated E2E test scripts in Node.js ESM (`scripts/test_exam_*.mjs`) can invoke domain functions directly against the database without mocking HTTP or Next.js internals.
2. **Server Actions Integration**: `app/student/exams/actions.ts` acts as a lightweight controller handling authentication, device guard checks, and cache revalidation before delegating to `lib/exams.ts`.
3. **Cross-Milestone Extensibility**: Provides clean hook points for Milestone 2 (Mastery Recalculation) and Milestone 3 (Rescue Case Triggering).

```
+-----------------------------------------------------------------------------------+
|               Client UI Layer (`components/student/exams/exam-detail.tsx`)        |
| - Auto-save debounce (5-10s)  - Online/Offline event listener  - Server timer sync|
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|             Server Actions Controller (`app/student/exams/actions.ts`)            |
| - `getCurrentStudent()`       - `assertDeviceAllowed()`        - `revalidatePath()`|
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|               Core Domain Service Engine (`lib/exams.ts`)                          |
| - `startOrResumeExamAttempt()`  - `saveDraftAnswers()`     - `submitExamAttempt()` |
| - `getExamAttemptStatus()`      - `sanitizeQuestions()`    - `gradeAgainstSnapshot|
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                   PostgreSQL Database (Prisma / Supabase)                         |
| - `exam_attempts` (JSONB snapshot/drafts)  - `exam_submissions`  - `exam_answers` |
+-----------------------------------------------------------------------------------+
```

---

## 3. Data Models & TypeScript Types Specification

### 3.1 TypeScript Type Definitions (`lib/exams.ts`)

```typescript
export type QuestionType = 'mcq' | 'essay' | 'file';
export type ContentMode = 'text' | 'image';
export type AttemptStatus = 'in_progress' | 'submitted' | 'expired' | 'abandoned';
export type GradingStatus = 'graded' | 'pending';

/**
 * Immutable snapshot item stored in exam_attempts.questions_snapshot
 */
export interface QuestionSnapshotItem {
  id: string;
  questionText: string;
  questionType: QuestionType;
  contentMode: ContentMode;
  imageUrl: string | null;
  points: number;
  options: string[];
  correctAnswer: string | null; // Stripped before sending to student client
  modelAnswer: string | null;   // Stripped before sending to student client
  orderIndex: number;
  bankQuestionId: string | null;
  skillIds?: string[];          // For M2 Taxonomy/Mastery linking
}

export type QuestionsSnapshot = QuestionSnapshotItem[];

/**
 * Sanitized question structure safe for student taking/resume phase
 */
export interface SanitizedStudentQuestion {
  id: string;
  questionText: string;
  questionType: QuestionType;
  contentMode: ContentMode;
  imageUrl: string | null;
  points: number;
  options: string[];
  orderIndex: number;
}

/**
 * Draft answer map structure stored in JSONB
 */
export interface DraftAnswerValue {
  selectedOption?: string | null;
  answerText?: string | null;
  fileUrl?: string | null;
  updatedAt?: string;
}

export type DraftAnswersMap = Record<string, DraftAnswerValue>;

/**
 * Student submission answer item
 */
export interface SubmittedAnswerItem {
  questionId: string;
  selectedOption?: string | null;
  answerText?: string | null;
  fileUrl?: string | null;
}

/**
 * Attempt DTO returned to caller
 */
export interface ExamAttemptDTO {
  id: string;
  examId: string;
  examCode: string;
  title: string;
  course: string | null;
  description: string | null;
  durationMinutes: number;
  passMark: number;
  totalPoints: number;
  startedAt: string;
  expiresAt: string;
  remainingSeconds: number;
  status: AttemptStatus;
  questions: SanitizedStudentQuestion[];
  draftAnswers: DraftAnswersMap;
  isResume: boolean;
  submission?: {
    id: string;
    score: number;
    total: number;
    percent: number;
    status: string;
    gradingStatus: GradingStatus;
    submittedAt: string;
  } | null;
}

/**
 * Parameter interfaces
 */
export interface StartOrResumeAttemptParams {
  studentId: string;
  examIdOrCode: string;
}

export interface SaveDraftAnswersParams {
  attemptId: string;
  studentId: string;
  answers: DraftAnswersMap;
}

export interface SubmitExamAttemptParams {
  attemptId: string;
  studentId: string;
  answers?: SubmittedAnswerItem[];
  idempotencyKey?: string;
}

export interface ExamServiceResponse<T = any> {
  success: boolean;
  error?: string;
  code?: string;
  data?: T;
}
```

### 3.2 Database Schema Migration DDL (`scripts/001_exam_attempts.sql`)

```sql
-- Create table for tracking active exam attempts and snapshotting
CREATE TABLE IF NOT EXISTS public.exam_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    status VARCHAR(30) NOT NULL DEFAULT 'in_progress', -- 'in_progress', 'submitted', 'expired', 'abandoned'
    started_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    expires_at TIMESTAMPTZ NOT NULL,
    submitted_at TIMESTAMPTZ,
    last_heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    idempotency_key VARCHAR(100),
    questions_snapshot JSONB NOT NULL,
    draft_answers JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- Fast lookup indexes
CREATE INDEX IF NOT EXISTS idx_exam_attempts_student_exam 
    ON public.exam_attempts (student_id, exam_id, status);

CREATE INDEX IF NOT EXISTS idx_exam_attempts_expires_active 
    ON public.exam_attempts (expires_at) 
    WHERE status = 'in_progress';

CREATE UNIQUE INDEX IF NOT EXISTS idx_exam_attempts_idempotency 
    ON public.exam_attempts (idempotency_key) 
    WHERE idempotency_key IS NOT NULL;

-- Enhance exam_submissions with attempt linkage and frozen snapshot
ALTER TABLE public.exam_submissions 
    ADD COLUMN IF NOT EXISTS attempt_id UUID REFERENCES public.exam_attempts(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS questions_snapshot JSONB;

-- Prevent cascade deletion of student answers when questions are deleted
ALTER TABLE public.exam_answers 
    DROP CONSTRAINT IF EXISTS exam_answers_question_id_fkey;

ALTER TABLE public.exam_answers 
    ADD CONSTRAINT exam_answers_question_id_fkey 
    FOREIGN KEY (question_id) REFERENCES public.exam_questions(id) ON DELETE SET NULL;
```

---

## 4. Detailed Function Logic & Implementation Design

### 4.1 `startOrResumeExamAttempt`

```typescript
export async function startOrResumeExamAttempt(
  params: StartOrResumeAttemptParams
): Promise<ExamServiceResponse<ExamAttemptDTO>> {
  const { studentId, examIdOrCode } = params;

  // 1. Resolve Exam Record
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(examIdOrCode);
  const exam = await prisma.exams.findFirst({
    where: isUuid ? { id: examIdOrCode } : { code: examIdOrCode },
    select: {
      id: true,
      code: true,
      title: true,
      course: true,
      description: true,
      duration: true,
      pass_mark: true,
      status: true,
      shuffle: true,
      stage_id: true,
      branch_id: true,
    }
  });

  if (!exam || exam.status !== 'منشور') {
    return { success: false, error: 'الاختبار غير متاح أو غير منشور', code: 'EXAM_NOT_FOUND' };
  }

  // 2. Check if student already completed this exam
  const existingSubmission = await prisma.exam_submissions.findFirst({
    where: { exam_id: exam.id, student_id: studentId },
    select: {
      id: true,
      score: true,
      total: true,
      status: true,
      grading_status: true,
      submitted_at: true,
    }
  });

  if (existingSubmission) {
    const totalPoints = existingSubmission.total || 0;
    const percent = totalPoints > 0 ? Math.round((existingSubmission.score / totalPoints) * 100) : 0;
    return {
      success: true,
      data: {
        id: '',
        examId: exam.id,
        examCode: exam.code,
        title: exam.title,
        course: exam.course,
        description: exam.description,
        durationMinutes: exam.duration,
        passMark: exam.pass_mark ?? 50,
        totalPoints,
        startedAt: '',
        expiresAt: '',
        remainingSeconds: 0,
        status: 'submitted',
        questions: [],
        draftAnswers: {},
        isResume: false,
        submission: {
          id: existingSubmission.id,
          score: existingSubmission.score,
          total: totalPoints,
          percent,
          status: existingSubmission.status,
          gradingStatus: existingSubmission.grading_status as GradingStatus,
          submittedAt: existingSubmission.submitted_at.toISOString(),
        }
      }
    };
  }

  // 3. Search for Active in-progress Attempt
  const activeAttempt = await prisma.exam_attempts.findFirst({
    where: {
      exam_id: exam.id,
      student_id: studentId,
      status: 'in_progress',
    },
    orderBy: { started_at: 'desc' }
  });

  const nowMs = Date.now();
  const GRACE_PERIOD_SECONDS = 30;

  if (activeAttempt) {
    const expiresAtMs = new Date(activeAttempt.expires_at).getTime();
    const remainingSeconds = Math.max(0, Math.floor((expiresAtMs - nowMs) / 1000));

    // Case 3a: Attempt expired while student was disconnected
    if (remainingSeconds <= 0) {
      await prisma.exam_attempts.update({
        where: { id: activeAttempt.id },
        data: { status: 'expired', updated_at: new Date() }
      });

      return {
        success: false,
        error: 'انتهت المهلة الزمنية المحددة للاختبار',
        code: 'ATTEMPT_EXPIRED'
      };
    }

    // Case 3b: Active attempt exists -> Seamless Auto-Resume
    await prisma.exam_attempts.update({
      where: { id: activeAttempt.id },
      data: { last_heartbeat_at: new Date() }
    });

    const snapshot = activeAttempt.questions_snapshot as QuestionsSnapshot;
    const sanitizedQuestions = sanitizeQuestions(snapshot);
    const totalPoints = snapshot.reduce((sum, q) => sum + (q.points || 1), 0);

    return {
      success: true,
      data: {
        id: activeAttempt.id,
        examId: exam.id,
        examCode: exam.code,
        title: exam.title,
        course: exam.course,
        description: exam.description,
        durationMinutes: exam.duration,
        passMark: exam.pass_mark ?? 50,
        totalPoints,
        startedAt: activeAttempt.started_at.toISOString(),
        expiresAt: activeAttempt.expires_at.toISOString(),
        remainingSeconds,
        status: 'in_progress',
        questions: sanitizedQuestions,
        draftAnswers: (activeAttempt.draft_answers as DraftAnswersMap) || {},
        isResume: true,
        submission: null,
      }
    };
  }

  // 4. Create New Attempt with Immutable Snapshot
  const questions = await prisma.exam_questions.findMany({
    where: { exam_id: exam.id },
    select: {
      id: true,
      question_text: true,
      question_type: true,
      content_mode: true,
      image_url: true,
      points: true,
      options: true,
      order_index: true,
      correct_answer: true,
      model_answer: true,
      bank_question_id: true,
    },
    orderBy: { order_index: 'asc' }
  });

  if (!questions || questions.length === 0) {
    return { success: false, error: 'هذا الاختبار لا يحتوي على أي أسئلة حالياً', code: 'NO_QUESTIONS' };
  }

  // Freeze full question snapshot
  let snapshot: QuestionsSnapshot = questions.map((q) => ({
    id: q.id,
    questionText: q.question_text || '',
    questionType: (q.question_type || 'mcq') as QuestionType,
    contentMode: (q.content_mode || 'text') as ContentMode,
    imageUrl: q.image_url,
    points: q.points || 1,
    options: Array.isArray(q.options) ? (q.options as string[]) : [],
    correctAnswer: q.correct_answer,
    modelAnswer: q.model_answer,
    orderIndex: q.order_index,
    bankQuestionId: q.bank_question_id,
  }));

  if (exam.shuffle) {
    snapshot = shuffleArray(snapshot);
    snapshot.forEach((q, idx) => { q.orderIndex = idx; });
  }

  const startedAt = new Date();
  const durationMs = (exam.duration || 30) * 60 * 1000;
  const graceMs = GRACE_PERIOD_SECONDS * 1000;
  const expiresAt = new Date(startedAt.getTime() + durationMs + graceMs);

  const newAttempt = await prisma.exam_attempts.create({
    data: {
      exam_id: exam.id,
      student_id: studentId,
      status: 'in_progress',
      started_at: startedAt,
      expires_at: expiresAt,
      last_heartbeat_at: startedAt,
      questions_snapshot: snapshot as any,
      draft_answers: {},
    }
  });

  const sanitizedQuestions = sanitizeQuestions(snapshot);
  const totalPoints = snapshot.reduce((sum, q) => sum + (q.points || 1), 0);
  const remainingSeconds = Math.floor((durationMs + graceMs) / 1000);

  return {
    success: true,
    data: {
      id: newAttempt.id,
      examId: exam.id,
      examCode: exam.code,
      title: exam.title,
      course: exam.course,
      description: exam.description,
      durationMinutes: exam.duration,
      passMark: exam.pass_mark ?? 50,
      totalPoints,
      startedAt: startedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      remainingSeconds,
      status: 'in_progress',
      questions: sanitizedQuestions,
      draftAnswers: {},
      isResume: false,
      submission: null,
    }
  };
}
```

---

### 4.2 `saveDraftAnswers`

```typescript
export async function saveDraftAnswers(
  params: SaveDraftAnswersParams
): Promise<ExamServiceResponse<{ remainingSeconds: number }>> {
  const { attemptId, studentId, answers } = params;

  // 1. Fetch attempt record
  const attempt = await prisma.exam_attempts.findUnique({
    where: { id: attemptId },
    select: {
      id: true,
      student_id: true,
      status: true,
      expires_at: true,
      draft_answers: true,
    }
  });

  if (!attempt || attempt.student_id !== studentId) {
    return { success: false, error: 'محاولة غير موجودة أو غير مصرح بها', code: 'INVALID_ATTEMPT' };
  }

  if (attempt.status !== 'in_progress') {
    return { success: false, error: 'لا يمكن حفظ مسودة لمسابقة غير نشطة', code: 'ATTEMPT_NOT_ACTIVE' };
  }

  // 2. Server-side time check
  const nowMs = Date.now();
  const expiresAtMs = new Date(attempt.expires_at).getTime();
  const remainingSeconds = Math.max(0, Math.floor((expiresAtMs - nowMs) / 1000));

  if (remainingSeconds <= 0) {
    await prisma.exam_attempts.update({
      where: { id: attemptId },
      data: { status: 'expired', updated_at: new Date() }
    });
    return { success: false, error: 'انتهت مدة الاختبار المحددة', code: 'ATTEMPT_EXPIRED', data: { remainingSeconds: 0 } };
  }

  // 3. Merge draft answers
  const existingDraft = (attempt.draft_answers as DraftAnswersMap) || {};
  const updatedDraft: DraftAnswersMap = { ...existingDraft };

  for (const [qId, val] of Object.entries(answers)) {
    updatedDraft[qId] = {
      ...updatedDraft[qId],
      ...val,
      updatedAt: new Date().toISOString(),
    };
  }

  // 4. Update attempt with heartbeat
  await prisma.exam_attempts.update({
    where: { id: attemptId },
    data: {
      draft_answers: updatedDraft as any,
      last_heartbeat_at: new Date(),
      updated_at: new Date(),
    }
  });

  return {
    success: true,
    data: { remainingSeconds }
  };
}
```

---

### 4.3 `submitExamAttempt`

```typescript
export async function submitExamAttempt(
  params: SubmitExamAttemptParams
): Promise<ExamServiceResponse<{
  submissionId: string;
  score: number;
  total: number;
  percent: number;
  status: string;
  gradingStatus: GradingStatus;
  alreadySubmitted: boolean;
}>> {
  const { attemptId, studentId, answers = [], idempotencyKey } = params;

  return await prisma.$transaction(async (tx) => {
    // 1. First, fetch attempt metadata
    const attempt = await tx.exam_attempts.findUnique({
      where: { id: attemptId },
      select: {
        id: true,
        exam_id: true,
        student_id: true,
        status: true,
        expires_at: true,
        questions_snapshot: true,
        draft_answers: true,
        idempotency_key: true,
      }
    });

    if (!attempt || attempt.student_id !== studentId) {
      return { success: false, error: 'المحاولة غير موجودة أو غير مصرح بها', code: 'INVALID_ATTEMPT' };
    }

    // 2. Concurrency Lock & Double Submission Check (Atomic Transition)
    const updatedCount = await tx.$executeRaw`
      UPDATE public.exam_attempts
      SET status = 'submitted',
          submitted_at = clock_timestamp(),
          idempotency_key = COALESCE(${idempotencyKey || null}, idempotency_key),
          updated_at = clock_timestamp()
      WHERE id = ${attemptId}::uuid 
        AND student_id = ${studentId}::uuid 
        AND status = 'in_progress'
    `;

    // If 0 rows updated -> Attempt was already submitted by a concurrent request
    if (updatedCount === 0) {
      const existingSub = await tx.exam_submissions.findFirst({
        where: { exam_id: attempt.exam_id, student_id: studentId },
        select: {
          id: true,
          score: true,
          total: true,
          status: true,
          grading_status: true,
        }
      });

      if (existingSub) {
        const totalPoints = existingSub.total || 0;
        const percent = totalPoints > 0 ? Math.round((existingSub.score / totalPoints) * 100) : 0;
        return {
          success: true,
          data: {
            submissionId: existingSub.id,
            score: existingSub.score,
            total: totalPoints,
            percent,
            status: existingSub.status,
            gradingStatus: existingSub.grading_status as GradingStatus,
            alreadySubmitted: true,
          }
        };
      }

      if (attempt.status === 'expired') {
        return { success: false, error: 'انتهت مدة الامتحان ولم يتم قبول التسليم', code: 'ATTEMPT_EXPIRED' };
      }

      return { success: false, error: 'تعذر تسليم الاختبار أو تم تسليمه مسبقاً', code: 'ALREADY_PROCESSED' };
    }

    // 3. Server Deadline Verification (With 30s Grace Period)
    const nowMs = Date.now();
    const expiresAtMs = new Date(attempt.expires_at).getTime();
    const HARD_LIMIT_GRACE_MS = 15000; // Extra buffer for network latency
    if (nowMs > expiresAtMs + HARD_LIMIT_GRACE_MS) {
      // Reject overdue submission
      await tx.exam_attempts.update({
        where: { id: attemptId },
        data: { status: 'expired' }
      });
      return { success: false, error: 'انتهت المهلة الزمنية للتسليم', code: 'SUBMISSION_DEADLINE_EXCEEDED' };
    }

    // 4. Grading strictly against Frozen questions_snapshot
    const snapshot = attempt.questions_snapshot as QuestionsSnapshot;
    const draftAnswers = (attempt.draft_answers as DraftAnswersMap) || {};
    const submittedMap = new Map<string, SubmittedAnswerItem>(answers.map((a) => [a.questionId, a]));

    let autoScore = 0;
    let totalPoints = 0;
    let hasManual = false;

    const answerRows: any[] = [];

    for (const q of snapshot) {
      totalPoints += (q.points || 1);
      const studentAns = submittedMap.get(q.id) || draftAnswers[q.id];

      if (q.questionType === 'mcq') {
        const selected = studentAns?.selectedOption ?? null;
        const isCorrect = (selected != null && selected === q.correctAnswer);
        const awarded = isCorrect ? (q.points || 1) : 0;
        autoScore += awarded;

        answerRows.push({
          question_id: q.id,
          selected_option: selected,
          answer_text: null,
          file_url: null,
          awarded_points: awarded,
          is_correct: isCorrect,
          needs_manual: false,
        });
      } else {
        hasManual = true;
        answerRows.push({
          question_id: q.id,
          selected_option: null,
          answer_text: studentAns?.answerText ?? null,
          file_url: studentAns?.fileUrl ?? null,
          awarded_points: 0,
          is_correct: null,
          needs_manual: true,
        });
      }
    }

    // 5. Calculate Result Metrics
    const exam = await tx.exams.findUnique({
      where: { id: attempt.exam_id },
      select: { pass_mark: true }
    });

    const gradingStatus: GradingStatus = hasManual ? 'pending' : 'graded';
    const score = autoScore;
    const percent = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;
    const passMark = exam?.pass_mark ?? 50;
    const status = hasManual ? 'قيد التصحيح' : percent >= passMark ? 'ناجح' : 'راسب';

    // 6. Persist exam_submissions and exam_answers
    const submission = await tx.exam_submissions.create({
      data: {
        exam_id: attempt.exam_id,
        student_id: studentId,
        attempt_id: attempt.id,
        score,
        total: totalPoints,
        auto_score: autoScore,
        manual_score: 0,
        grading_status: gradingStatus,
        status,
        questions_snapshot: snapshot as any,
        exam_answers: {
          create: answerRows
        }
      },
      select: { id: true }
    });

    // 7. Increment exam participant count
    await tx.exams.update({
      where: { id: attempt.exam_id },
      data: { participants: { increment: 1 } }
    });

    return {
      success: true,
      data: {
        submissionId: submission.id,
        score,
        total: totalPoints,
        percent,
        status,
        gradingStatus,
        alreadySubmitted: false,
      }
    };
  });
}
```

---

### 4.4 `getExamAttemptStatus` & Helper Functions

```typescript
export async function getExamAttemptStatus(
  attemptId: string,
  studentId: string
): Promise<ExamServiceResponse<{ status: AttemptStatus; remainingSeconds: number; startedAt: string; expiresAt: string }>> {
  const attempt = await prisma.exam_attempts.findUnique({
    where: { id: attemptId },
    select: {
      id: true,
      student_id: true,
      status: true,
      started_at: true,
      expires_at: true,
    }
  });

  if (!attempt || attempt.student_id !== studentId) {
    return { success: false, error: 'المحاولة غير موجودة', code: 'INVALID_ATTEMPT' };
  }

  const nowMs = Date.now();
  const expiresAtMs = new Date(attempt.expires_at).getTime();
  const remainingSeconds = Math.max(0, Math.floor((expiresAtMs - nowMs) / 1000));

  let currentStatus = attempt.status as AttemptStatus;
  if (currentStatus === 'in_progress' && remainingSeconds <= 0) {
    currentStatus = 'expired';
    await prisma.exam_attempts.update({
      where: { id: attemptId },
      data: { status: 'expired' }
    });
  }

  return {
    success: true,
    data: {
      status: currentStatus,
      remainingSeconds,
      startedAt: attempt.started_at.toISOString(),
      expiresAt: attempt.expires_at.toISOString(),
    }
  };
}

/**
 * Sanitizes QuestionSnapshotItem array, stripping secret answer fields for student client
 */
export function sanitizeQuestions(snapshot: QuestionsSnapshot): SanitizedStudentQuestion[] {
  return snapshot.map((q) => ({
    id: q.id,
    questionText: q.questionText,
    questionType: q.questionType,
    contentMode: q.contentMode,
    imageUrl: q.imageUrl,
    points: q.points,
    options: q.options,
    orderIndex: q.orderIndex,
  }));
}

/**
 * Fisher-Yates shuffle helper
 */
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
```

---

## 5. Deep-Dive Edge-Case Analysis

### 5.1 Server-Side Timer Enforcement
- **Authoritative Clock**: The timer calculation is governed entirely by `attempt.expires_at - clock_timestamp()`.
- **Clock Spoofing Immunity**: If a student changes their device clock backwards by 5 hours or freezes JavaScript execution in DevTools, the server clock calculation remains completely unaffected. When the student makes a request (`saveDraftAnswers` or `submitExamAttempt`), the server evaluates `Date.now() > expiresAtMs` and rejects the operation.
- **Grace Period (30s)**: Accounts for network latency and connection handshakes without compromising security.

### 5.2 Concurrency Locking & Double Submission
- **Mechanics**: Using atomic PostgreSQL `UPDATE public.exam_attempts SET status = 'submitted' WHERE id = $1 AND status = 'in_progress'`.
- **Zero Race Conditions**: If 10 identical requests arrive in parallel, exactly one executes the `UPDATE` (returning rowCount = 1). The remaining 9 requests get rowCount = 0 and enter the idempotency fallback branch, which retrieves the created submission and returns `{ success: true, alreadySubmitted: true }`.
- **Database Safety**: Eliminates unhandled `P2002 Unique Constraint Violation` errors.

### 5.3 Snapshot Integrity & Deletion Shielding
- **Inception Snapshotting**: At the moment an attempt starts, `questions_snapshot` is stored in `exam_attempts`.
- **Live Edit Isolation**: If an instructor modifies a question text, alters the correct MCQ option, or deletes the question while students are taking the exam, existing attempts continue evaluating against the frozen snapshot in `attempt.questions_snapshot`.
- **Cascade Deletion Fix**: By updating the foreign key constraint on `exam_answers.question_id` to `ON DELETE SET NULL`, deleting a question from `exam_questions` will never delete historical `exam_answers` records.

---

## 6. Downstream Integration Points

### 6.1 Milestone 2 (Taxonomy & Mastery Recalculation Hook)
In `submitExamAttempt`, once `exam_submissions` is created, trigger the mastery calculation:
```typescript
// Integration Hook for M2
if (typeof recalculateStudentMasteryForAttempt === 'function') {
  void recalculateStudentMasteryForAttempt(studentId, attempt.exam_id, submission.id).catch((err) => {
    console.error('Mastery calculation hook error:', err);
  });
}
```

### 6.2 Milestone 3 (Rescue Case Trigger Hook)
If the student fails the exam (`status === 'راسب'`), trigger risk evaluation:
```typescript
// Integration Hook for M3
if (status === 'راسب' && typeof evaluateStudentRisk === 'function') {
  void evaluateStudentRisk(studentId).catch((err) => {
    console.error('Rescue evaluation hook error:', err);
  });
}
```

---

## 7. Verification Method & Test Suite Specs

To verify `lib/exams.ts` in isolation, the following standalone test runners will be executed:

1. `scripts/test_exam_resume.mjs`:
   - Validates draft auto-save and state restoration upon simulated disconnect.
2. `scripts/test_exam_server_timer.mjs`:
   - Validates server clock authority and post-deadline submission rejection.
3. `scripts/test_exam_double_submit.mjs`:
   - Validates parallel double submissions (10 concurrent requests -> 1 DB submission).
4. `scripts/test_exam_snapshot_integrity.mjs`:
   - Validates immunity against teacher live edits and deletions.

---

## 8. Conclusion & Recommendations

The technical design presented above fulfills all requirements of **Milestone 1 (Exams Edge Cases)**. 

### Key Recommendations for Implementation:
1. Create `scripts/001_exam_attempts.sql` and apply it to PostgreSQL.
2. Update `prisma/schema.prisma` with `model exam_attempts` and relational fields in `exam_submissions`.
3. Implement `lib/exams.ts` adhering to the function contracts and error codes specified in this report.
4. Refactor `app/student/exams/actions.ts` and `components/student/exams/exam-detail.tsx` to utilize `lib/exams.ts`.
5. Execute the test suites to guarantee 100% pass rate across all edge cases.

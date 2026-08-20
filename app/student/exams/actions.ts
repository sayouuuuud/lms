'use server'
import { logError } from '@/lib/logger'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getCurrentStudent } from '@/lib/auth-guard'
import { assertDeviceAllowed } from '@/lib/device-guard'
import {
  startOrResumeExamAttempt,
  saveDraftAnswers,
  submitExamAttempt,
  getExamAttemptStatus,
  sanitizeQuestions,
  type DraftAnswersMap,
  type SubmittedAnswerItem,
  type QuestionsSnapshot,
} from '@/lib/exams'

export type StudentExamQuestion = {
  id: string
  type: 'mcq' | 'essay' | 'file'
  contentMode: 'text' | 'image'
  text: string
  imageUrl: string | null
  points: number
  options: string[]
}

export type StudentAnswerReview = {
  questionId: string
  awardedPoints: number
  isCorrect: boolean | null
  needsManual: boolean
  selectedOption: string | null
  answerText: string | null
  fileUrl: string | null
  correctAnswer: string | null
  modelAnswer: string | null
}

export type ActiveExamAttemptDTO = {
  id: string
  startedAt: string
  expiresAt: string
  remainingSeconds: number
  draftAnswers: Record<string, { selectedOption?: string | null; answerText?: string | null; fileUrl?: string | null }>
  status: 'in_progress' | 'submitted' | 'expired' | 'abandoned'
}

export type StudentExam = {
  id?: string
  code: string
  title: string
  course: string | null
  description: string | null
  durationMinutes: number
  passMark: number
  totalPoints: number
  questions: StudentExamQuestion[]
  activeAttempt?: ActiveExamAttemptDTO | null
  submission: {
    id?: string
    score: number
    total: number
    status: string
    gradingStatus: 'graded' | 'pending'
    submittedAt: string
    answers: StudentAnswerReview[]
  } | null
}

export async function studentCanAccessExam(
  student: any,
  exam: { stage_id?: string | null; branch_id?: string | null },
): Promise<boolean> {
  const { hasActiveSubscription } = await import('@/lib/subscriptions')
  const isSub = await hasActiveSubscription(student.user_id)
  if (isSub) return true

  const hasStage = !exam.stage_id
  const hasBranch = !exam.branch_id

  if (!hasStage && !hasBranch) return true
  if (hasStage && student.stage_id && exam.stage_id === student.stage_id) return true

  if (hasBranch) {
    const orders = await prisma.orders.findMany({
      where: { student_id: student.user_id, status: 'approved' },
      include: { order_items: { select: { lecture_id: true } } }
    })

    const purchasedLectureIds: string[] = []
    for (const o of orders) {
      for (const item of o.order_items) {
        if (item.lecture_id) purchasedLectureIds.push(item.lecture_id)
      }
    }

    if (purchasedLectureIds.length > 0) {
      const lectures = await prisma.lectures.findMany({
        where: { id: { in: purchasedLectureIds }, branch_id: exam.branch_id as string },
        select: { id: true }
      })
      if (lectures.length > 0) return true
    }
  }

  return false
}

export async function getStudentExam(code: string): Promise<StudentExam | null> {
  const guard = await assertDeviceAllowed()
  if (!guard.ok) return null

  const student = await getCurrentStudent()
  if (!student) return null

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(code)
  
  let exam
  if (isUuid) {
    exam = await prisma.exams.findUnique({
      where: { id: code },
      select: {
        id: true,
        code: true,
        title: true,
        course: true,
        description: true,
        duration: true,
        pass_mark: true,
        status: true,
        stage_id: true,
        branch_id: true,
        is_published: true,
        release_date: true,
      }
    })
  } else {
    exam = await prisma.exams.findFirst({
      where: { code },
      select: {
        id: true,
        code: true,
        title: true,
        course: true,
        description: true,
        duration: true,
        pass_mark: true,
        status: true,
        stage_id: true,
        branch_id: true,
        is_published: true,
        release_date: true,
      }
    })
  }

  if (!exam || exam.status !== 'منشور') return null
  if (exam.is_published === false) return null
  if (exam.release_date && new Date(exam.release_date) > new Date()) return null
  if (!(await studentCanAccessExam(student, exam))) return null

  // 1. Check existing submission
  const submission = await prisma.exam_submissions.findFirst({
    where: { exam_id: exam.id, student_id: student.id },
    select: {
      id: true,
      score: true,
      total: true,
      status: true,
      grading_status: true,
      submitted_at: true,
      questions_snapshot: true,
    }
  })

  if (submission) {
    const answers = await prisma.exam_answers.findMany({
      where: { submission_id: submission.id },
      select: {
        question_id: true,
        awarded_points: true,
        is_correct: true,
        needs_manual: true,
        selected_option: true,
        answer_text: true,
        file_url: true,
      }
    })

    let qList: StudentExamQuestion[] = []
    let keyMap = new Map<string, { correct: string | null; model: string | null }>()

    if (submission.questions_snapshot && Array.isArray(submission.questions_snapshot)) {
      const snap = submission.questions_snapshot as unknown as QuestionsSnapshot
      qList = sanitizeQuestions(snap).map((q) => ({
        id: q.id,
        type: q.questionType,
        contentMode: q.contentMode,
        text: q.questionText,
        imageUrl: q.imageUrl,
        points: q.points,
        options: q.options,
      }))
      for (const item of snap) {
        keyMap.set(item.id, {
          correct: item.correctAnswer ?? item.correct_answer ?? null,
          model: item.modelAnswer ?? item.model_answer ?? null,
        })
      }
    } else {
      const liveQuestions = await prisma.exam_questions.findMany({
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
        },
        orderBy: { order_index: 'asc' }
      })
      qList = liveQuestions.map((q) => ({
        id: q.id,
        type: (q.question_type ?? 'mcq') as 'mcq' | 'essay' | 'file',
        contentMode: (q.content_mode ?? 'text') as 'text' | 'image',
        text: q.question_text ?? '',
        imageUrl: q.image_url ?? null,
        points: q.points ?? 1,
        options: Array.isArray(q.options) ? (q.options as string[]) : [],
      }))
      for (const k of liveQuestions) {
        keyMap.set(k.id, { correct: k.correct_answer, model: k.model_answer })
      }
    }

    const totalPoints = submission.total || qList.reduce((sum, q) => sum + (q.points || 0), 0)

    return {
      id: exam.id,
      code: exam.code,
      title: exam.title,
      course: exam.course,
      description: exam.description,
      durationMinutes: exam.duration || 30,
      passMark: exam.pass_mark ?? 50,
      totalPoints,
      questions: qList,
      activeAttempt: null,
      submission: {
        id: submission.id,
        score: submission.score ?? 0,
        total: totalPoints,
        status: submission.status ?? '',
        gradingStatus: (submission.grading_status ?? 'graded') as 'graded' | 'pending',
        submittedAt: submission.submitted_at ? submission.submitted_at.toISOString() : '',
        answers: answers.map((a) => ({
          questionId: a.question_id,
          awardedPoints: a.awarded_points ?? 0,
          isCorrect: a.is_correct,
          needsManual: a.needs_manual ?? false,
          selectedOption: a.selected_option ?? null,
          answerText: a.answer_text ?? null,
          fileUrl: a.file_url ?? null,
          correctAnswer: keyMap.get(a.question_id)?.correct ?? null,
          modelAnswer: keyMap.get(a.question_id)?.model ?? null,
        })),
      },
    }
  }

  // 2. Check for active in-progress attempt
  const activeAttempt = await prisma.exam_attempts.findFirst({
    where: {
      exam_id: exam.id,
      student_id: student.id,
      status: 'in_progress',
    },
    orderBy: { started_at: 'desc' }
  })

  if (activeAttempt) {
    const expiresAtMs = new Date(activeAttempt.expires_at).getTime()
    const remainingSeconds = Math.max(0, Math.floor((expiresAtMs - Date.now()) / 1000))

    if (remainingSeconds > 0) {
      const snap = (activeAttempt.questions_snapshot as unknown) as QuestionsSnapshot
      const sanitized = sanitizeQuestions(snap).map((q) => ({
        id: q.id,
        type: q.questionType,
        contentMode: q.contentMode,
        text: q.questionText,
        imageUrl: q.imageUrl,
        points: q.points,
        options: q.options,
      }))
      const totalPoints = activeAttempt.total_points || sanitized.reduce((sum, q) => sum + (q.points || 0), 0)

      return {
        id: exam.id,
        code: exam.code,
        title: exam.title,
        course: exam.course,
        description: exam.description,
        durationMinutes: exam.duration || 30,
        passMark: exam.pass_mark ?? 50,
        totalPoints,
        questions: sanitized,
        activeAttempt: {
          id: activeAttempt.id,
          startedAt: activeAttempt.started_at.toISOString(),
          expiresAt: activeAttempt.expires_at.toISOString(),
          remainingSeconds,
          draftAnswers: ((activeAttempt.answers as unknown) as Record<string, any>) || {},
          status: 'in_progress',
        },
        submission: null,
      }
    }
  }

  // 3. Brand new exam view (no active attempt)
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
    },
    orderBy: { order_index: 'asc' }
  })

  const qList: StudentExamQuestion[] = questions.map((q) => ({
    id: q.id,
    type: (q.question_type ?? 'mcq') as 'mcq' | 'essay' | 'file',
    contentMode: (q.content_mode ?? 'text') as 'text' | 'image',
    text: q.question_text ?? '',
    imageUrl: q.image_url ?? null,
    points: q.points ?? 1,
    options: Array.isArray(q.options) ? (q.options as string[]) : [],
  }))

  const totalPoints = qList.reduce((sum, q) => sum + (q.points || 0), 0)

  return {
    id: exam.id,
    code: exam.code,
    title: exam.title,
    course: exam.course,
    description: exam.description,
    durationMinutes: exam.duration || 30,
    passMark: exam.pass_mark ?? 50,
    totalPoints,
    questions: qList,
    activeAttempt: null,
    submission: null,
  }
}

export type StartOrResumeResponse = {
  success: boolean
  error?: string
  code?: string
  attempt?: {
    id: string
    examCode: string
    startedAt: string
    expiresAt: string
    remainingSeconds: number
    status: string
    draftAnswers: Record<string, any>
    questions: StudentExamQuestion[]
  }
  data?: any
}

export async function startOrResumeExamAttemptAction(code: string): Promise<StartOrResumeResponse> {
  const guard = await assertDeviceAllowed()
  if (!guard.ok) return { success: false, error: guard.message }

  const student = await getCurrentStudent()
  if (!student) return { success: false, error: 'يجب تسجيل الدخول أولاً' }

  const result = await startOrResumeExamAttempt({
    studentId: student.id,
    examIdOrCode: code,
  })

  if (!result.success || !result.data) {
    return {
      success: false,
      error: result.error || 'تعذر بدء أو استئناف الاختبار',
      code: result.code,
    }
  }

  const dto = result.data
  const sanitizedQuestions: StudentExamQuestion[] = dto.questions.map((q) => ({
    id: q.id,
    type: q.questionType,
    contentMode: q.contentMode,
    text: q.questionText,
    imageUrl: q.imageUrl,
    points: q.points,
    options: q.options,
  }))

  return {
    success: true,
    attempt: {
      id: dto.id,
      examCode: dto.examCode,
      startedAt: dto.startedAt,
      expiresAt: dto.expiresAt,
      remainingSeconds: dto.remainingSeconds,
      status: dto.status,
      draftAnswers: dto.draftAnswers,
      questions: sanitizedQuestions,
    },
    data: dto,
  }
}

export type SaveDraftResponse = {
  success: boolean
  remainingSeconds: number
  serverTimestamp: number
  error?: string
  expired?: boolean
}

export async function saveDraftAnswersAction(
  attemptId: string,
  draftAnswers: Record<string, any>
): Promise<SaveDraftResponse> {
  const guard = await assertDeviceAllowed()
  if (!guard.ok) return { success: false, remainingSeconds: 0, serverTimestamp: Date.now(), error: guard.message }

  const student = await getCurrentStudent()
  if (!student) return { success: false, remainingSeconds: 0, serverTimestamp: Date.now(), error: 'يجب تسجيل الدخول' }

  const res = await saveDraftAnswers({
    attemptId,
    studentId: student.id,
    answers: draftAnswers as DraftAnswersMap,
  })

  return {
    success: res.success,
    remainingSeconds: res.remainingSeconds ?? 0,
    serverTimestamp: res.serverTimestamp ?? Date.now(),
    error: res.error,
    expired: res.expired,
  }
}

export type SubmitExamPayload = {
  attemptId: string
  idempotencyKey?: string
  answers?: SubmittedAnswerItem[]
}

export type SubmitExamResult = {
  success: boolean
  error?: string
  submissionId?: string
  score?: number
  total?: number
  percent?: number
  gradingStatus?: 'graded' | 'pending'
  status?: string
  alreadySubmitted?: boolean
}

export async function submitExamAttemptAction(payload: SubmitExamPayload): Promise<SubmitExamResult> {
  const guard = await assertDeviceAllowed()
  if (!guard.ok) return { success: false, error: guard.message }

  const student = await getCurrentStudent()
  if (!student) return { success: false, error: 'يجب تسجيل الدخول' }

  const res = await submitExamAttempt({
    attemptId: payload.attemptId,
    studentId: student.id,
    idempotencyKey: payload.idempotencyKey,
    answers: payload.answers,
  })

  if (res.success) {
    try {
      revalidatePath('/student/exams')
      const attempt = await prisma.exam_attempts.findUnique({
        where: { id: payload.attemptId },
        select: { exams: { select: { code: true } } }
      })
      if (attempt?.exams?.code) {
        revalidatePath(`/student/exams/${attempt.exams.code}`)
      }
    } catch (e) {
      // Revalidation error should not fail submit response
    }
  }

  return {
    success: res.success,
    error: res.error,
    submissionId: res.submissionId,
    score: res.score,
    total: res.total,
    percent: res.percent,
    gradingStatus: res.gradingStatus,
    status: res.status,
    alreadySubmitted: res.alreadySubmitted,
  }
}

export type SubmitAnswer = {
  questionId: string
  selectedOption?: string | null
  answerText?: string | null
  fileUrl?: string | null
}

/**
 * Backward compatibility wrapper for legacy submitExam callers.
 */
export async function submitExam(code: string, answers: SubmitAnswer[]) {
  const guard = await assertDeviceAllowed()
  if (!guard.ok) return { success: false, error: guard.message }

  const student = await getCurrentStudent()
  if (!student) return { success: false, error: 'لازم تسجّل دخول.' }

  const startRes = await startOrResumeExamAttempt({
    studentId: student.id,
    examIdOrCode: code,
  })

  if (!startRes.success || !startRes.data) {
    return { success: false, error: startRes.error || 'تعذر بدء الاختبار للتسليم' }
  }

  const attemptId = startRes.data.id
  const submitRes = await submitExamAttempt({
    attemptId,
    studentId: student.id,
    answers: answers.map((a) => ({
      questionId: a.questionId,
      selectedOption: a.selectedOption,
      answerText: a.answerText,
      fileUrl: a.fileUrl,
    })),
    idempotencyKey: `legacy_submit_${attemptId}_${student.id}`,
  })

  if (submitRes.success) {
    revalidatePath('/student/exams')
    revalidatePath(`/student/exams/${code}`)
  }

  return {
    success: submitRes.success,
    error: submitRes.error,
    score: submitRes.score,
    total: submitRes.total,
    status: submitRes.status,
    gradingStatus: submitRes.gradingStatus,
  }
}

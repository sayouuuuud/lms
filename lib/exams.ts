import { prisma, rawPrisma } from './prisma.ts'

export type QuestionType = 'mcq' | 'essay' | 'file'
export type ContentMode = 'text' | 'image'
export type AttemptStatus = 'in_progress' | 'submitted' | 'expired' | 'abandoned'
export type GradingStatus = 'graded' | 'pending'

export interface QuestionSnapshotItem {
  id: string
  questionText: string
  questionType: QuestionType
  contentMode: ContentMode
  imageUrl: string | null
  points: number
  options: string[]
  correctAnswer: string | null
  modelAnswer: string | null
  orderIndex: number
  bankQuestionId: string | null
  // Compatibility fields with snake_case
  question_text?: string
  question_type?: string
  content_mode?: string
  image_url?: string | null
  correct_answer?: string | null
  model_answer?: string | null
  order_index?: number
  bank_question_id?: string | null
}

export type QuestionsSnapshot = QuestionSnapshotItem[]

export interface SanitizedStudentQuestion {
  id: string
  questionText: string
  questionType: QuestionType
  contentMode: ContentMode
  imageUrl: string | null
  points: number
  options: string[]
  orderIndex: number
  // Aliases for frontend compatibility
  text?: string
  type?: QuestionType
}

export interface DraftAnswerValue {
  selectedOption?: string | null
  answerText?: string | null
  fileUrl?: string | null
  updatedAt?: string
  // Snake case compatibility
  selected_option?: string | null
  answer_text?: string | null
  file_url?: string | null
}

export type DraftAnswersMap = Record<string, DraftAnswerValue>

export interface SubmittedAnswerItem {
  questionId: string
  selectedOption?: string | null
  answerText?: string | null
  fileUrl?: string | null
  // Snake case compatibility
  selected_option?: string | null
  answer_text?: string | null
  file_url?: string | null
}

export interface ExamAttemptDTO {
  id: string
  examId: string
  examCode: string
  title: string
  course: string | null
  description: string | null
  durationMinutes: number
  passMark: number
  totalPoints: number
  startedAt: string
  expiresAt: string
  remainingSeconds: number
  status: AttemptStatus
  questions: SanitizedStudentQuestion[]
  draftAnswers: DraftAnswersMap
  isResume: boolean
  submission?: {
    id: string
    score: number
    total: number
    percent: number
    status: string
    gradingStatus: GradingStatus
    submittedAt: string
  } | null
}

export interface StartOrResumeAttemptParams {
  studentId: string
  examId?: string
  examCode?: string
  examIdOrCode?: string
}

export interface SaveDraftAnswersParams {
  attemptId: string
  studentId: string
  answers: DraftAnswersMap
}

export interface SubmitExamAttemptParams {
  attemptId: string
  studentId: string
  answers?: SubmittedAnswerItem[]
  idempotencyKey?: string
}

export interface ExamServiceResponse<T = any> {
  success: boolean
  error?: string
  code?: string
  data?: T
  attempt?: any
  submissionId?: string
  score?: number
  total?: number
  percent?: number
  status?: string
  gradingStatus?: GradingStatus
  alreadySubmitted?: boolean
  remainingSeconds?: number
  serverTimestamp?: number
  expired?: boolean
  startedAt?: string
  expiresAt?: string
}

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/**
 * Sanitizes QuestionSnapshotItem array, stripping secret answer fields for student client
 */
export function sanitizeQuestions(snapshot: QuestionsSnapshot | any[]): SanitizedStudentQuestion[] {
  if (!Array.isArray(snapshot)) return []
  return snapshot.map((q, idx) => {
    const qText = q.questionText ?? q.question_text ?? ''
    const qType = ((q.questionType ?? q.question_type ?? 'mcq') as QuestionType)
    const cMode = ((q.contentMode ?? q.content_mode ?? 'text') as ContentMode)
    const img = q.imageUrl ?? q.image_url ?? null
    const pts = q.points ?? 1
    const opts = Array.isArray(q.options) ? (q.options as string[]) : []
    const oIdx = q.orderIndex ?? q.order_index ?? idx

    return {
      id: q.id,
      questionText: qText,
      questionType: qType,
      contentMode: cMode,
      imageUrl: img,
      points: pts,
      options: opts,
      orderIndex: oIdx,
      // Frontend convenience aliases
      text: qText,
      type: qType,
    }
  })
}

/**
 * Start or resume an active exam attempt.
 * Preserves timer, snapshots questions, restores draft answers if resumed.
 */
export async function startOrResumeExamAttempt(
  params: StartOrResumeAttemptParams
): Promise<ExamServiceResponse<ExamAttemptDTO>> {
  const studentId = params.studentId
  const examIdOrCode = params.examIdOrCode || params.examId || params.examCode || ''

  if (!studentId || !examIdOrCode) {
    return { success: false, error: 'بيانات غير صالحة', code: 'INVALID_PARAMS' }
  }

  // 1. Resolve Exam Record
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(examIdOrCode)
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
  })

  if (!exam || exam.status !== 'منشور') {
    return { success: false, error: 'الاختبار غير متاح أو غير منشور', code: 'EXAM_NOT_FOUND' }
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
  })

  if (existingSubmission) {
    const totalPoints = existingSubmission.total || 0
    const percent = totalPoints > 0 ? Math.round((existingSubmission.score / totalPoints) * 100) : 0
    const dto: ExamAttemptDTO = {
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
    return {
      success: true,
      data: dto,
      attempt: {
        id: '',
        examCode: exam.code,
        startedAt: '',
        expiresAt: '',
        remainingSeconds: 0,
        status: 'submitted',
        draftAnswers: {},
        questions: [],
      }
    }
  }

  // 3. Search for Active in-progress Attempt
  const activeAttempt = await prisma.exam_attempts.findFirst({
    where: {
      exam_id: exam.id,
      student_id: studentId,
      status: 'in_progress',
    },
    orderBy: { started_at: 'desc' }
  })

  const nowMs = Date.now()
  const GRACE_PERIOD_SECONDS = 30

  if (activeAttempt) {
    const expiresAtMs = new Date(activeAttempt.expires_at).getTime()
    const remainingSeconds = Math.max(0, Math.floor((expiresAtMs - nowMs) / 1000))

    // Case 3a: Attempt expired while student was disconnected
    if (remainingSeconds <= 0) {
      await prisma.exam_attempts.update({
        where: { id: activeAttempt.id },
        data: { status: 'expired', updated_at: new Date() }
      })

      return {
        success: false,
        error: 'انتهت المهلة الزمنية المحددة للاختبار',
        code: 'ATTEMPT_EXPIRED'
      }
    }

    // Case 3b: Active attempt exists → Seamless Auto-Resume
    await prisma.exam_attempts.update({
      where: { id: activeAttempt.id },
      data: { last_heartbeat_at: new Date() }
    })

    const snapshot = (activeAttempt.questions_snapshot as unknown) as QuestionsSnapshot
    const sanitizedQuestions = sanitizeQuestions(snapshot)
    const totalPoints = activeAttempt.total_points || snapshot.reduce((sum, q) => sum + (q.points || 1), 0)
    const draftAnswers = ((activeAttempt.answers as unknown) as DraftAnswersMap) || {}

    const dto: ExamAttemptDTO = {
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
      draftAnswers,
      isResume: true,
      submission: null,
    }

    return {
      success: true,
      data: dto,
      attempt: {
        id: activeAttempt.id,
        examCode: exam.code,
        startedAt: activeAttempt.started_at.toISOString(),
        expiresAt: activeAttempt.expires_at.toISOString(),
        remainingSeconds,
        status: 'in_progress',
        draftAnswers,
        questions: sanitizedQuestions,
      }
    }
  }

  // 3c: Check for recently expired attempts — prevent silent restart
  const expiredAttempt = await prisma.exam_attempts.findFirst({
    where: {
      exam_id: exam.id,
      student_id: studentId,
      status: 'expired',
    },
    orderBy: { started_at: 'desc' }
  })

  if (expiredAttempt) {
    return {
      success: false,
      error: 'انتهت المهلة الزمنية المحددة للاختبار ولا يمكن إعادة بدء المحاولة',
      code: 'ATTEMPT_EXPIRED'
    }
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
  })

  if (!questions || questions.length === 0) {
    return { success: false, error: 'هذا الاختبار لا يحتوي على أي أسئلة حالياً', code: 'NO_QUESTIONS' }
  }

  // Freeze full question snapshot
  let snapshot: QuestionSnapshotItem[] = questions.map((q, idx) => ({
    id: q.id,
    questionText: q.question_text || '',
    questionType: (q.question_type || 'mcq') as QuestionType,
    contentMode: (q.content_mode || 'text') as ContentMode,
    imageUrl: q.image_url,
    points: q.points || 1,
    options: Array.isArray(q.options) ? (q.options as string[]) : [],
    correctAnswer: q.correct_answer,
    modelAnswer: q.model_answer,
    orderIndex: q.order_index ?? idx,
    bankQuestionId: q.bank_question_id,
    // snake_case aliases
    question_text: q.question_text || '',
    question_type: q.question_type || 'mcq',
    content_mode: q.content_mode || 'text',
    image_url: q.image_url,
    correct_answer: q.correct_answer,
    model_answer: q.model_answer,
    order_index: q.order_index ?? idx,
    bank_question_id: q.bank_question_id,
  }))

  if (exam.shuffle) {
    snapshot = shuffleArray(snapshot)
    snapshot.forEach((q, idx) => {
      q.orderIndex = idx
      q.order_index = idx
    })
  }

  const startedAt = new Date()
  const durationMs = (exam.duration || 30) * 60 * 1000
  const graceMs = GRACE_PERIOD_SECONDS * 1000
  const expiresAt = new Date(startedAt.getTime() + durationMs + graceMs)
  const totalPoints = snapshot.reduce((sum, q) => sum + (q.points || 1), 0)

  const newAttempt = await prisma.exam_attempts.create({
    data: {
      exam_id: exam.id,
      student_id: studentId,
      status: 'in_progress',
      started_at: startedAt,
      expires_at: expiresAt,
      last_heartbeat_at: startedAt,
      questions_snapshot: snapshot as any,
      answers: {},
      total_points: totalPoints,
      score: 0,
    }
  })

  const sanitizedQuestions = sanitizeQuestions(snapshot)
  const remainingSeconds = Math.floor((durationMs + graceMs) / 1000)

  const dto: ExamAttemptDTO = {
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

  return {
    success: true,
    data: dto,
    attempt: {
      id: newAttempt.id,
      examCode: exam.code,
      startedAt: startedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      remainingSeconds,
      status: 'in_progress',
      draftAnswers: {},
      questions: sanitizedQuestions,
    }
  }
}

/**
 * Persist draft answers to JSONB with server time verification.
 */
export async function saveDraftAnswers(
  params: SaveDraftAnswersParams
): Promise<ExamServiceResponse<{ remainingSeconds: number }>> {
  const { attemptId, studentId, answers } = params

  const attempt = await prisma.exam_attempts.findUnique({
    where: { id: attemptId },
    select: {
      id: true,
      student_id: true,
      status: true,
      expires_at: true,
      answers: true,
    }
  })

  if (!attempt || attempt.student_id !== studentId) {
    return { success: false, error: 'محاولة غير موجودة أو غير مصرح بها', code: 'INVALID_ATTEMPT' }
  }

  // Server-side time check FIRST (before status check)
  const nowMs = Date.now()
  const expiresAtMs = new Date(attempt.expires_at).getTime()
  const remainingSeconds = Math.max(0, Math.floor((expiresAtMs - nowMs) / 1000))

  if (remainingSeconds <= 0 || attempt.status === 'expired') {
    if (attempt.status === 'in_progress') {
      await prisma.exam_attempts.update({
        where: { id: attemptId },
        data: { status: 'expired', updated_at: new Date() }
      })
    }
    return {
      success: false,
      error: 'انتهت مدة الاختبار المحددة',
      code: 'ATTEMPT_EXPIRED',
      expired: true,
      remainingSeconds: 0,
      data: { remainingSeconds: 0 }
    }
  }

  if (attempt.status !== 'in_progress') {
    return { success: false, error: 'لا يمكن حفظ مسودة لمسابقة غير نشطة', code: 'ATTEMPT_NOT_ACTIVE' }
  }


  // Merge draft answers
  const existingDraft = ((attempt.answers as unknown) as DraftAnswersMap) || {}
  const updatedDraft: DraftAnswersMap = { ...existingDraft }

  for (const [qId, val] of Object.entries(answers || {})) {
    updatedDraft[qId] = {
      ...updatedDraft[qId],
      ...val,
      updatedAt: new Date().toISOString(),
    }
  }

  await prisma.exam_attempts.update({
    where: { id: attemptId },
    data: {
      answers: updatedDraft as any,
      last_heartbeat_at: new Date(),
      updated_at: new Date(),
    }
  })

  return {
    success: true,
    remainingSeconds,
    serverTimestamp: nowMs,
    data: { remainingSeconds }
  }
}

/**
 * Submit exam attempt atomically with idempotency protection and snapshot evaluation.
 */
export async function submitExamAttempt(
  params: SubmitExamAttemptParams
): Promise<ExamServiceResponse<{
  submissionId: string
  score: number
  total: number
  percent: number
  status: string
  gradingStatus: GradingStatus
  alreadySubmitted: boolean
}>> {
  const { attemptId, studentId, answers = [], idempotencyKey } = params

  return await prisma.$transaction(async (tx: any) => {
    // 1. Fetch attempt metadata
    const attempt = await tx.exam_attempts.findUnique({
      where: { id: attemptId },
      select: {
        id: true,
        exam_id: true,
        student_id: true,
        status: true,
        expires_at: true,
        questions_snapshot: true,
        answers: true,
        idempotency_key: true,
      }
    })

    if (!attempt || attempt.student_id !== studentId) {
      return { success: false, error: 'المحاولة غير موجودة أو غير مصرح بها', code: 'INVALID_ATTEMPT' }
    }

    // 2. Concurrency Lock & Double Submission Check (Atomic Transition)
    const updatedCount = await tx.$executeRaw`
      UPDATE public.exam_attempts
      SET status = 'submitted',
          submitted_at = clock_timestamp(),
          idempotency_key = COALESCE(${idempotencyKey || null}, idempotency_key),
          is_locked = TRUE,
          lock_timestamp = clock_timestamp(),
          updated_at = clock_timestamp()
      WHERE id = ${attemptId}::uuid 
        AND student_id = ${studentId}::uuid 
        AND status = 'in_progress'
    `

    // If 0 rows updated -> Attempt was already submitted or locked by a concurrent request
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
      })

      if (existingSub) {
        const totalPoints = existingSub.total || 0
        const percent = totalPoints > 0 ? Math.round((existingSub.score / totalPoints) * 100) : 0
        const retData = {
          submissionId: existingSub.id,
          score: existingSub.score,
          total: totalPoints,
          percent,
          status: existingSub.status,
          gradingStatus: existingSub.grading_status as GradingStatus,
          alreadySubmitted: true,
        }
        return {
          success: true,
          ...retData,
          data: retData,
        }
      }

      if (attempt.status === 'expired') {
        return { success: false, error: 'انتهت مدة الامتحان ولم يتم قبول التسليم', code: 'ATTEMPT_EXPIRED' }
      }

      return { success: false, error: 'تعذر تسليم الاختبار أو تم تسليمه مسبقاً', code: 'ALREADY_PROCESSED' }
    }

    // 3. Server Deadline Verification (With 15s Hard Grace Buffer)
    const nowMs = Date.now()
    const expiresAtMs = new Date(attempt.expires_at).getTime()
    const HARD_LIMIT_GRACE_MS = 15000
    if (nowMs > expiresAtMs + HARD_LIMIT_GRACE_MS) {
      await tx.exam_attempts.update({
        where: { id: attemptId },
        data: { status: 'expired' }
      })
      return { success: false, error: 'انتهت المهلة الزمنية للتسليم', code: 'SUBMISSION_DEADLINE_EXCEEDED' }
    }

    // 4. Grading strictly against Frozen questions_snapshot
    const snapshot = (attempt.questions_snapshot as unknown) as QuestionsSnapshot
    const draftAnswers = ((attempt.answers as unknown) as DraftAnswersMap) || {}
    const submittedMap = new Map<string, SubmittedAnswerItem>(
      (answers || []).map((a) => [a.questionId, a])
    )

    let autoScore = 0
    let totalPoints = 0
    let hasManual = false
    const answerRows: any[] = []

    for (const q of snapshot) {
      const qPts = q.points || 1
      totalPoints += qPts
      const studentAns = submittedMap.get(q.id) || draftAnswers[q.id]
      const qType = q.questionType ?? q.question_type ?? 'mcq'
      const correctKey = q.correctAnswer ?? q.correct_answer

      if (qType === 'mcq') {
        const selected = studentAns?.selectedOption ?? studentAns?.selected_option ?? null
        const isCorrect = selected != null && selected === correctKey
        const awarded = isCorrect ? qPts : 0
        autoScore += awarded

        answerRows.push({
          question_id: q.id,
          selected_option: selected,
          answer_text: null,
          file_url: null,
          awarded_points: awarded,
          is_correct: isCorrect,
          needs_manual: false,
        })
      } else {
        hasManual = true
        answerRows.push({
          question_id: q.id,
          selected_option: null,
          answer_text: studentAns?.answerText ?? studentAns?.answer_text ?? null,
          file_url: studentAns?.fileUrl ?? studentAns?.file_url ?? null,
          awarded_points: 0,
          is_correct: null,
          needs_manual: true,
        })
      }
    }

    // 5. Calculate Result Metrics
    const exam = await tx.exams.findUnique({
      where: { id: attempt.exam_id },
      select: { pass_mark: true }
    })

    const gradingStatus: GradingStatus = hasManual ? 'pending' : 'graded'
    const score = autoScore
    const percent = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0
    const passMark = exam?.pass_mark ?? 50
    const status = hasManual ? 'قيد التصحيح' : percent >= passMark ? 'ناجح' : 'راسب'

    // Update attempt record with score & total points
    const finalAnswersMap: DraftAnswersMap = { ...draftAnswers }
    if (answers && answers.length > 0) {
      for (const a of answers) {
        finalAnswersMap[a.questionId] = {
          selectedOption: a.selectedOption ?? a.selected_option,
          answerText: a.answerText ?? a.answer_text,
          fileUrl: a.fileUrl ?? a.file_url,
          updatedAt: new Date().toISOString(),
        }
      }
    }

    await tx.exam_attempts.update({
      where: { id: attemptId },
      data: {
        score,
        total_points: totalPoints,
        answers: finalAnswersMap as any,
      }
    })

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
    })

    // 7. Increment exam participant count
    await tx.exams.update({
      where: { id: attempt.exam_id },
      data: { participants: { increment: 1 } }
    })

    const resultData = {
      submissionId: submission.id,
      score,
      total: totalPoints,
      percent,
      status,
      gradingStatus,
      alreadySubmitted: false,
    }

    return {
      success: true,
      ...resultData,
      data: resultData,
    }
  })
}

/**
 * Fetch authoritative status & remaining seconds of an exam attempt.
 */
export async function getExamAttemptStatus(
  attemptIdOrParams: string | { attemptId: string; studentId: string },
  optionalStudentId?: string
): Promise<ExamServiceResponse<{ status: AttemptStatus; remainingSeconds: number; startedAt: string; expiresAt: string }>> {
  let attemptId: string
  let studentId: string

  if (typeof attemptIdOrParams === 'object') {
    attemptId = attemptIdOrParams.attemptId
    studentId = attemptIdOrParams.studentId
  } else {
    attemptId = attemptIdOrParams
    studentId = optionalStudentId || ''
  }

  const attempt = await prisma.exam_attempts.findUnique({
    where: { id: attemptId },
    select: {
      id: true,
      student_id: true,
      status: true,
      started_at: true,
      expires_at: true,
    }
  })

  if (!attempt || (studentId && attempt.student_id !== studentId)) {
    return { success: false, error: 'المحاولة غير موجودة', code: 'INVALID_ATTEMPT' }
  }

  const nowMs = Date.now()
  const expiresAtMs = new Date(attempt.expires_at).getTime()
  const remainingSeconds = Math.max(0, Math.floor((expiresAtMs - nowMs) / 1000))

  let currentStatus = attempt.status as AttemptStatus
  if (currentStatus === 'in_progress' && remainingSeconds <= 0) {
    currentStatus = 'expired'
    await prisma.exam_attempts.update({
      where: { id: attemptId },
      data: { status: 'expired' }
    })
  }

  const data = {
    status: currentStatus,
    remainingSeconds,
    startedAt: attempt.started_at.toISOString(),
    expiresAt: attempt.expires_at.toISOString(),
  }

  return {
    success: true,
    ...data,
    data,
  }
}

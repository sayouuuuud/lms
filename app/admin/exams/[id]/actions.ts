'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth-guard'

export type ExamQuestion = {
  id: string
  text: string
  options: string[]
  correctAnswer: string
  points: number
}

export type ExamSubmissionDetail = {
  id: string
  studentId: string
  studentName: string
  studentCode: string
  score: number
  total: number
  status: string
  submittedAt: string
}

export type ExamDetailsData = {
  id: string
  code: string
  title: string
  course: string
  duration: number
  questionsCount: number
  participants: number
  avgScore: number
  status: string
  createdAt: string
  questions: ExamQuestion[]
  submissions: ExamSubmissionDetail[]
}

export async function getExamDetails(code: string): Promise<ExamDetailsData | null> {
  const supabase = await createClient()
  if (!(await requireAdmin(supabase))) return null

  // 1. Fetch exam
  const { data: exam, error: examError } = await supabase
    .from('exams')
    .select('*')
    .eq('code', code)
    .single()

  if (examError || !exam) return null

  // 2. Fetch questions
  const { data: questionsData } = await supabase
    .from('exam_questions')
    .select('*')
    .eq('exam_id', exam.id)
    .order('created_at', { ascending: true })

  const questions: ExamQuestion[] = (questionsData || []).map((q: any) => ({
    id: q.id,
    text: q.question_text,
    options: q.options as string[],
    correctAnswer: q.correct_answer,
    points: q.points,
  }))

  // 3. Fetch submissions with student info
  const { data: submissionsData } = await supabase
    .from('exam_submissions')
    .select(`
      id,
      student_id,
      score,
      total,
      status,
      submitted_at,
      students (
        id,
        name,
        code
      )
    `)
    .eq('exam_id', exam.id)
    .order('submitted_at', { ascending: false })

  const submissions: ExamSubmissionDetail[] = (submissionsData || []).map((s: any) => ({
    id: s.id,
    studentId: s.students?.id || s.student_id,
    studentName: s.students?.name || 'غير معروف',
    studentCode: s.students?.code || '-',
    score: s.score,
    total: s.total,
    status: s.status,
    submittedAt: new Date(s.submitted_at).toLocaleString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
  }))

  // Calculate some stats if possible (e.g., actual average from submissions, pass rate)
  // But for now we rely on the exam fields or compute them
  const actualParticipants = submissions.length
  let avgScore = exam.avg_score
  if (actualParticipants > 0) {
    const totalScore = submissions.reduce((sum, s) => sum + (s.score / s.total) * 100, 0)
    avgScore = Math.round(totalScore / actualParticipants)
  }

  return {
    id: exam.id,
    code: exam.code,
    title: exam.title,
    course: exam.course,
    duration: exam.duration,
    questionsCount: questions.length > 0 ? questions.length : exam.questions,
    participants: actualParticipants > 0 ? actualParticipants : exam.participants,
    avgScore,
    status: exam.status,
    createdAt: new Date(exam.created_at).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    questions,
    submissions,
  }
}

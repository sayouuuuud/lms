'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth-guard'
import { revalidatePath } from 'next/cache'
import type { ExamRecord, ExamStatus } from '@/lib/exams-data'

// Shape sent from the exam builder (client) to be persisted.
export type SaveExamPayload = {
  meta: {
    title: string
    course: string
    description: string
    duration: number
    passMark: number
    shuffle: boolean
  }
  questions: Array<{
    type: 'mcq' | 'essay' | 'file'
    contentMode: 'text' | 'image'
    text: string
    imageUrl: string
    points: number
    // MCQ
    options: { id: string; text: string }[]
    correctOptionId: string | null
    // Essay
    modelAnswer: string
  }>
  publish: boolean
}

function makeExamCode() {
  return `EX-${Date.now().toString(36).toUpperCase()}`
}

// Persists a new exam + its questions. MCQ correct answers are stored as the
// option *value* (matching the existing seeded data format).
export async function saveExam(payload: SaveExamPayload) {
  const supabase = await createClient()
  if (!(await requireAdmin(supabase))) {
    return { success: false, error: 'غير مصرح لك' }
  }

  const { meta, questions, publish } = payload

  const code = makeExamCode()
  const { data: exam, error: examError } = await supabase
    .from('exams')
    .insert({
      code,
      title: meta.title.trim(),
      course: meta.course.trim() || null,
      description: meta.description.trim() || null,
      duration: meta.duration,
      pass_mark: meta.passMark,
      shuffle: meta.shuffle,
      questions: questions.length,
      participants: 0,
      avg_score: 0,
      status: publish ? 'منشور' : 'مسودة',
    })
    .select('id, code')
    .single()

  if (examError || !exam) {
    console.log('[v0] saveExam exam insert error:', examError?.message)
    return { success: false, error: 'تعذر حفظ الاختبار' }
  }

  if (questions.length > 0) {
    const rows = questions.map((q, index) => {
      const correctValue =
        q.type === 'mcq'
          ? (q.options.find((o) => o.id === q.correctOptionId)?.text ?? null)
          : null
      return {
        exam_id: exam.id,
        question_text: q.text.trim(),
        question_type: q.type,
        content_mode: q.contentMode,
        image_url: q.contentMode === 'image' ? q.imageUrl : null,
        options: q.type === 'mcq' ? q.options.map((o) => o.text) : null,
        correct_answer: correctValue,
        model_answer: q.type === 'essay' ? q.modelAnswer.trim() || null : null,
        points: q.points || 1,
        order_index: index,
      }
    })

    const { error: qError } = await supabase.from('exam_questions').insert(rows)
    if (qError) {
      console.log('[v0] saveExam questions insert error:', qError.message)
      // Roll back the exam so we don't leave an empty shell.
      await supabase.from('exams').delete().eq('id', exam.id)
      return { success: false, error: 'تعذر حفظ الأسئلة' }
    }
  }

  revalidatePath('/admin/exams')
  return { success: true, code: exam.code }
}

export async function getExams(): Promise<ExamRecord[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('exams')
    .select('*')
    .order('created_at', { ascending: false })

  if (error || !data) return []

  return data.map((row) => {
    const d = new Date(row.created_at)
    return {
      id: row.code,
      title: row.title,
      course: row.course,
      questions: row.questions,
      duration: row.duration,
      participants: row.participants,
      avgScore: row.avg_score,
      status: row.status as ExamStatus,
      createdAt: `${d.getDate()} ${d.toLocaleString('ar-EG', { month: 'long' })} ${d.getFullYear()}`
    }
  })
}

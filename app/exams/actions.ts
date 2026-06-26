'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth-guard'
import { revalidatePath } from 'next/cache'
import type { ExamRecord, ExamStatus } from '@/lib/exams-data'

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

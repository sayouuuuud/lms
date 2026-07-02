'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// Marks a single lesson as completed for the current student. `lessonId` is the
// lesson's database UUID. Idempotent via the unique (user_id, item_type, item_id).
export async function markLessonComplete(lessonId: string, courseSlug?: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'يجب تسجيل الدخول.' }

  const { error } = await supabase
    .from('student_content_progress')
    .upsert(
      {
        user_id: user.id,
        item_type: 'lesson',
        item_id: lessonId,
        status: 'completed',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,item_type,item_id' },
    )

  if (error) {
    console.log('[v0] markLessonComplete error:', error.message)
    return { error: 'تعذّر حفظ التقدّم.' }
  }

  if (courseSlug) revalidatePath(`/student/courses/${courseSlug}`)
  revalidatePath('/student/courses')
  return { success: true }
}

// Records an assignment submission for the current student.
// Writes to assignment_submissions (the real table) keyed by the assignment's
// UUID. For all-MCQ assignments the score is stored immediately and status is
// set to 'مصحّح'; otherwise it is 'تم التسليم' and awaits manual grading.
export async function submitAssignmentProgress(
  assignmentCode: string,
  payload: { status: 'تم التسليم' | 'مصحّح'; score?: number; courseSlug?: string },
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'يجب تسجيل الدخول.' }

  // Resolve the student row.
  const { data: studentRow } = await supabase
    .from('students')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!studentRow) return { error: 'لم يتم العثور على بيانات الطالب.' }

  // Resolve assignment UUID from its code.
  const { data: asgRow } = await supabase
    .from('assignments')
    .select('id')
    .eq('code', assignmentCode)
    .single()
  if (!asgRow) return { error: 'الواجب غير موجود.' }

  const { error } = await supabase
    .from('assignment_submissions')
    .upsert(
      {
        assignment_id: asgRow.id,
        student_id: studentRow.id,
        status: payload.status,
        score: payload.score ?? null,
        submitted_at: new Date().toISOString(),
      },
      { onConflict: 'assignment_id,student_id' },
    )

  if (error) {
    return { error: 'تعذّر حفظ التسليم.' }
  }

  if (payload.courseSlug) revalidatePath(`/student/courses/${payload.courseSlug}`)
  revalidatePath('/student/assignments')
  return { success: true }
}

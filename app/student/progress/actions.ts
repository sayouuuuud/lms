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

// Records an assignment submission for the current student. For all-MCQ
// assignments we store the computed score and mark it graded; otherwise it is
// marked submitted and awaits manual grading.
export async function submitAssignmentProgress(
  assignmentId: string,
  payload: { status: 'تم التسليم' | 'مصحّح'; score?: number; courseSlug?: string },
) {
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
        item_type: 'assignment',
        item_id: assignmentId,
        status: payload.status,
        score: payload.score ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,item_type,item_id' },
    )

  if (error) {
    console.log('[v0] submitAssignmentProgress error:', error.message)
    return { error: 'تعذّر حفظ التسليم.' }
  }

  if (payload.courseSlug) revalidatePath(`/student/courses/${payload.courseSlug}`)
  revalidatePath('/student/courses')
  return { success: true }
}

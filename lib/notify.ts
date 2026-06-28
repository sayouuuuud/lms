import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import type { NotificationType } from '@/lib/notifications-data'

// Server-side helper for creating notifications. Uses the service-role client
// so it works from any admin action regardless of the caller's RLS context.
// Notifications can be:
//   • broadcast to everyone        → studentId omitted, grade omitted
//   • targeted to one grade/stage  → grade set (e.g. 'sec-1')
//   • targeted to one student      → studentId set (students.id)
type NotifyInput = {
  type: NotificationType
  title: string
  description?: string
  studentId?: string | null
  grade?: string | null
}

function genCode() {
  // Random-ish unique code without Date.now collisions across a burst.
  const rand = Math.random().toString(36).slice(2, 8)
  return `NTF-${rand}`
}

export async function createNotification(input: NotifyInput) {
  try {
    const admin = createAdminClient()
    const row: Record<string, any> = {
      code: genCode(),
      type: input.type,
      title: input.title,
      description: input.description ?? '',
      read: false,
      time_label: 'الآن',
    }
    if (input.studentId) row.student_id = input.studentId
    // grade column is optional (added by the migration); include only when set
    // so the insert still works before the migration runs.
    if (input.grade) row.grade = input.grade

    let { error } = await admin.from('notifications').insert(row)

    // If the optional `grade` column doesn't exist yet (migration not run),
    // retry without it so the notification is still delivered as a broadcast.
    if (error && /grade/.test(error.message) && 'grade' in row) {
      delete row.grade
      ;({ error } = await admin.from('notifications').insert(row))
    }

    if (error) {
      console.log('[v0] createNotification error:', error.message)
      return { error: error.message }
    }
    return { success: true }
  } catch (e: any) {
    console.log('[v0] createNotification threw:', e?.message)
    return { error: 'failed' }
  }
}

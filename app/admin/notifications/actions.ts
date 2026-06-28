'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth-guard'
import { createNotification } from '@/lib/notify'
import { revalidatePath } from 'next/cache'
import type { NotificationRecord, NotificationType } from '@/lib/notifications-data'

// Admin broadcasts an announcement to students. `grade` of 'all' targets every
// student; a specific stage slug (sec-1/sec-2/sec-3) targets that grade only.
export async function sendAnnouncement(input: {
  title: string
  description: string
  grade: string
}) {
  const supabase = await createClient()
  if (!(await requireAdmin(supabase))) {
    return { error: 'غير مسموح. لازم تكون أدمن.' }
  }
  const title = input.title.trim()
  if (!title) return { error: 'العنوان مطلوب.' }

  const res = await createNotification({
    type: 'طالب',
    title,
    description: input.description.trim(),
    grade: input.grade === 'all' ? null : input.grade,
  })
  if (res.error) return { error: 'تعذّر إرسال الإشعار. حاول تاني.' }

  revalidatePath('/notifications')
  return { success: true }
}

export async function getNotifications(): Promise<NotificationRecord[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })

  if (error || !data) return []

  return data.map((row) => ({
    id: row.code,
    type: row.type as NotificationType,
    title: row.title,
    description: row.description,
    time: row.time_label,
    read: row.read,
  }))
}

export async function markAsRead(id: string) {
  const supabase = await createClient()
  if (!(await requireAdmin(supabase))) {
    return { error: 'غير مسموح. لازم تكون أدمن.' }
  }

  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('code', id)

  if (error) return { error: error.message }
  revalidatePath('/notifications')
  return { success: true }
}

export async function markAllAsRead() {
  const supabase = await createClient()
  if (!(await requireAdmin(supabase))) {
    return { error: 'غير مسموح. لازم تكون أدمن.' }
  }

  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('read', false)

  if (error) return { error: error.message }
  revalidatePath('/notifications')
  return { success: true }
}

export async function deleteNotification(id: string) {
  const supabase = await createClient()
  if (!(await requireAdmin(supabase))) {
    return { error: 'غير مسموح. لازم تكون أدمن.' }
  }

  const { error } = await supabase.from('notifications').delete().eq('code', id)
  if (error) return { error: error.message }
  revalidatePath('/notifications')
  return { success: true }
}

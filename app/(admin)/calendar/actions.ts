'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth-guard'
import { createNotification } from '@/lib/notify'
import { revalidatePath } from 'next/cache'
import type { CalendarEvent, CalendarEventType } from '@/lib/calendar-data'

export async function getEvents(): Promise<CalendarEvent[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .order('event_date', { ascending: true })
    .order('event_time', { ascending: true })

  if (error || !data) return []

  return data.map((row) => ({
    id: row.code,
    title: row.title,
    date: row.event_date,
    time: row.event_time,
    type: row.type as CalendarEventType,
    course: row.course || undefined,
    description: row.description || undefined,
    custom: row.custom,
  }))
}

export async function createEvent(values: {
  title: string
  date: string
  time: string
  type: string
  course?: string
  description?: string
}) {
  const supabase = await createClient()
  if (!(await requireAdmin(supabase))) {
    return { error: 'غير مسموح. لازم تكون أدمن.' }
  }

  const { data: latest } = await supabase
    .from('calendar_events')
    .select('code')
    .order('code', { ascending: false })
    .limit(1)
    .single()

  let nextNum = 1
  if (latest && latest.code.startsWith('EVT-')) {
    const num = parseInt(latest.code.replace('EVT-', ''), 10)
    if (!isNaN(num)) nextNum = num + 1
  }
  const code = `EVT-${String(nextNum).padStart(2, '0')}`

  const { error } = await supabase.from('calendar_events').insert({
    code,
    title: values.title,
    event_date: values.date,
    event_time: values.time,
    type: values.type,
    course: values.course,
    description: values.description,
    custom: true,
  })

  if (error) return { error: error.message }

  // Notify all students about the new event (exam / assignment / lesson, etc).
  await createNotification({
    type: values.type === 'اختبار' ? 'اختبار' : 'نظام',
    title: `موعد جديد: ${values.title}`,
    description: `${values.date} - ${values.time}${values.course ? ` · ${values.course}` : ''}`,
  })

  revalidatePath('/calendar')
  return { success: true }
}

export async function updateEvent(
  id: string,
  values: {
    title: string
    date: string
    time: string
    type: string
    course?: string
    description?: string
  },
) {
  const supabase = await createClient()
  if (!(await requireAdmin(supabase))) {
    return { error: 'غير مسموح. لازم تكون أدمن.' }
  }

  const { error } = await supabase
    .from('calendar_events')
    .update({
      title: values.title,
      event_date: values.date,
      event_time: values.time,
      type: values.type,
      course: values.course,
      description: values.description,
    })
    .eq('code', id)

  if (error) return { error: error.message }
  revalidatePath('/calendar')
  return { success: true }
}

export async function deleteEvent(id: string) {
  const supabase = await createClient()
  if (!(await requireAdmin(supabase))) {
    return { error: 'غير مسموح. لازم تكون أدمن.' }
  }

  const { error } = await supabase.from('calendar_events').delete().eq('code', id)
  if (error) return { error: error.message }
  revalidatePath('/calendar')
  return { success: true }
}

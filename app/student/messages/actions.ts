'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Conversation, ChatMessage } from '@/lib/student-messages-data'

// In the stored chat_history, `fromMe: true` is admin-relative (sent by the
// admin/support team). For the student view we invert it so the student's own
// messages appear as "from me".
function toStudentMessages(history: any[]): ChatMessage[] {
  if (!Array.isArray(history)) return []
  return history.map((m, i) => ({
    id: m.id ?? `m${i}`,
    fromMe: !m.fromMe,
    text: m.text ?? '',
    time: m.time ?? '',
  }))
}

export async function getStudentConversations(): Promise<Conversation[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('messages')
    .select('code, subject, content, time_label, chat_history, is_online')
    .eq('student_id', user.id)
    .order('created_at', { ascending: false })

  if (error || !data) return []

  return data.map((row: any) => ({
    id: row.code,
    name: 'فريق الدعم',
    role: 'الدعم والإدارة',
    initials: 'د',
    course: row.subject ?? '',
    online: row.is_online ?? false,
    lastTime: row.time_label ?? '',
    unread: 0,
    messages: toStudentMessages(row.chat_history),
  }))
}

export async function sendStudentMessage(code: string, text: string) {
  const message = text.trim()
  if (!message) return { error: 'الرسالة فاضية.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'لازم تسجّل دخول.' }

  const { data: convo } = await supabase
    .from('messages')
    .select('chat_history')
    .eq('code', code)
    .eq('student_id', user.id)
    .single()

  if (!convo) return { error: 'المحادثة غير موجودة.' }

  // Student message → stored as fromMe:false (admin-relative)
  const newMsg = { id: `m${Date.now()}`, fromMe: false, text: message, time: 'الآن' }
  const history = Array.isArray(convo.chat_history) ? convo.chat_history : []

  const { error } = await supabase
    .from('messages')
    .update({
      chat_history: [...history, newMsg],
      content: message,
      time_label: 'الآن',
      unread_count: 1,
    })
    .eq('code', code)
    .eq('student_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/student/messages')
  return { success: true }
}

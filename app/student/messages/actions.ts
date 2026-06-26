'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import type { Conversation, ChatMessage } from '@/lib/student-messages-data'

// The `messages` table is admin-only under RLS. Student reads/writes are
// therefore performed with the service-role client, but ALWAYS scoped to the
// authenticated user's own id (messages.student_id = auth user id) so a student
// can only ever touch their own conversations.

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

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('messages')
    .select('code, subject, content, time_label, chat_history, is_online')
    .eq('student_id', user.id)
    .order('created_at', { ascending: false })

  if (error || !data) return []

  return data.map((row: any) => ({
    id: row.code,
    name: 'أ. عبد السلام',
    role: 'المدرّس وفريق الدعم',
    initials: 'ع',
    course: row.subject ?? '',
    online: row.is_online ?? false,
    lastTime: row.time_label ?? '',
    unread: 0,
    messages: toStudentMessages(row.chat_history),
  }))
}

// Starts a brand-new conversation from the student to the teacher/support.
// Writes go through the service-role client because the messages table is
// admin-only under RLS; the row is always scoped to the authenticated user.
export async function startConversation(subject: string, text: string) {
  const message = text.trim()
  if (!message) return { error: 'اكتب رسالتك الأول.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'لازم تسجّل دخول.' }

  const admin = createAdminClient()

  // Look up a friendly display name for the student.
  const { data: profile } = await admin
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle()
  const studentName = profile?.full_name || user.email || 'طالب'

  // Stored as fromMe:false → admin-relative (i.e. sent BY the student).
  const newMsg = { id: `m${Date.now()}`, fromMe: false, text: message, time: 'الآن' }
  const code = `conv-${user.id.slice(0, 8)}-${Date.now().toString(36)}`

  const { error } = await admin.from('messages').insert({
    code,
    student_id: user.id,
    sender_name: studentName,
    sender_avatar: null,
    subject: subject.trim() || 'رسالة من الطالب',
    content: message,
    time_label: 'الآن',
    is_read: false,
    has_attachment: false,
    sender_role: 'student',
    course: '',
    unread_count: 1,
    is_online: false,
    chat_history: [newMsg],
  })

  if (error) return { error: error.message }
  revalidatePath('/student/messages')
  return { success: true, code }
}

export async function sendStudentMessage(code: string, text: string) {
  const message = text.trim()
  if (!message) return { error: 'الرسالة فاضية.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'لازم تسجّل دخول.' }

  const admin = createAdminClient()

  const { data: convo } = await admin
    .from('messages')
    .select('chat_history')
    .eq('code', code)
    .eq('student_id', user.id)
    .single()

  if (!convo) return { error: 'المحادثة غير موجودة.' }

  // Student message → stored as fromMe:false (admin-relative)
  const newMsg = { id: `m${Date.now()}`, fromMe: false, text: message, time: 'الآن' }
  const history = Array.isArray(convo.chat_history) ? convo.chat_history : []

  const { error } = await admin
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

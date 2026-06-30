'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import type { Conversation, ChatMessage, TicketStatus } from '@/lib/student-messages-data'

// The single contact a student is allowed to reach: the teacher / support.
const TEACHER_NAME = 'أ. عبد السلام'
const TEACHER_ROLE = 'المدرّس وفريق الدعم'
const TEACHER_INITIALS = 'ع'

// The `messages` table is admin-only under RLS. Student reads/writes are
// therefore performed with the service-role client, but ALWAYS scoped to the
// authenticated user's own id so a student can only ever touch their own tickets.

// In the stored chat_history, `fromMe: true` is admin/teacher-relative. For the
// student view we invert it so the student's own messages appear as "from me".
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
    .select('code, subject, content, time_label, chat_history, status, student_unread')
    .eq('student_id', user.id)
    .order('created_at', { ascending: false })

  if (error || !data) return []

  return data.map((row: any) => ({
    id: row.code,
    name: TEACHER_NAME,
    role: TEACHER_ROLE,
    initials: TEACHER_INITIALS,
    subject: row.subject ?? 'تذكرة دعم',
    status: (row.status as TicketStatus) ?? 'open',
    lastTime: row.time_label ?? '',
    unread: row.student_unread ?? 0,
    messages: toStudentMessages(row.chat_history),
  }))
}

// Opens a new support ticket from the student to the teacher.
export async function startConversation(subject: string, text: string) {
  const message = text.trim()
  if (!message) return { error: 'اكتب رسالتك الأول.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'لازم تسجّل دخول.' }

  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle()
  const studentName = profile?.full_name || user.email || 'طالب'

  // Stored as fromMe:false → sent BY the student.
  const newMsg = { id: `m${Date.now()}`, fromMe: false, text: message, time: 'الآن' }
  const code = `ticket-${user.id.slice(0, 8)}-${Date.now().toString(36)}`

  const { error } = await admin.from('messages').insert({
    code,
    student_id: user.id,
    sender_name: studentName,
    sender_avatar: null,
    subject: subject.trim() || 'تذكرة دعم',
    content: message,
    time_label: 'الآن',
    is_read: false,
    has_attachment: false,
    sender_role: 'student',
    course: '',
    unread_count: 1, // unread for the admin
    student_unread: 0,
    is_online: false,
    status: 'open',
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
    .select('chat_history, unread_count')
    .eq('code', code)
    .eq('student_id', user.id)
    .single()

  if (!convo) return { error: 'التذكرة غير موجودة.' }

  // Student message → stored as fromMe:false (teacher-relative).
  const newMsg = { id: `m${Date.now()}`, fromMe: false, text: message, time: 'الآن' }
  const history = Array.isArray(convo.chat_history) ? convo.chat_history : []

  const { error } = await admin
    .from('messages')
    .update({
      chat_history: [...history, newMsg],
      content: message,
      time_label: 'الآن',
      unread_count: (convo.unread_count ?? 0) + 1, // unread for the admin
      // a student follow-up reopens a closed ticket
      status: 'open',
    })
    .eq('code', code)
    .eq('student_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/student/messages')
  return { success: true }
}

// Marks the teacher's replies as read once the student opens the ticket.
export async function markTicketRead(code: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'لازم تسجّل دخول.' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('messages')
    .update({ student_unread: 0 })
    .eq('code', code)
    .eq('student_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/student/messages')
  return { success: true }
}

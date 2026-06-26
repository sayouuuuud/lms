'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth-guard'
import { revalidatePath } from 'next/cache'
import type { Conversation, ChatMessage } from '@/lib/messages-data'

export async function getConversations(): Promise<Conversation[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .order('created_at', { ascending: false })

  if (error || !data) return []

  return data.map((row) => ({
    id: row.code,
    name: row.sender_name,
    course: row.course,
    preview: row.content,
    time: row.time_label,
    unread: row.unread_count,
    online: row.is_online,
    messages: row.chat_history as ChatMessage[],
  }))
}

export async function markAsRead(id: string) {
  const supabase = await createClient()
  if (!(await requireAdmin(supabase))) {
    return { error: 'غير مسموح. لازم تكون أدمن.' }
  }

  const { error } = await supabase
    .from('messages')
    .update({ unread_count: 0 })
    .eq('code', id)

  if (error) return { error: error.message }
  revalidatePath('/messages')
  return { success: true }
}

export async function replyToConversation(id: string, message: string) {
  const supabase = await createClient()
  if (!(await requireAdmin(supabase))) {
    return { error: 'غير مسموح. لازم تكون أدمن.' }
  }

  const { data } = await supabase
    .from('messages')
    .select('chat_history')
    .eq('code', id)
    .single()

  if (!data) return { error: 'المحادثة غير موجودة.' }

  const history = data.chat_history as ChatMessage[]
  
  const newMsg: ChatMessage = {
    id: `m${Date.now()}`,
    fromMe: true,
    text: message,
    time: 'الآن',
  }
  
  const newHistory = [...history, newMsg]

  const { error } = await supabase
    .from('messages')
    .update({ 
      chat_history: newHistory,
      content: message,
      time_label: 'الآن'
    })
    .eq('code', id)

  if (error) return { error: error.message }
  revalidatePath('/messages')
  return { success: true, newMsg }
}

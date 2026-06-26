'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowRight,
  Check,
  CheckCheck,
  Loader2,
  MessageSquare,
  Paperclip,
  Plus,
  Search,
  Send,
  Smile,
  X,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { type Conversation } from '@/lib/student-messages-data'
import { sendStudentMessage, startConversation } from '@/app/student/messages/actions'

export function StudentMessagesPage({
  initialConversations,
}: {
  initialConversations: Conversation[]
}) {
  const router = useRouter()
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations)
  const [activeId, setActiveId] = useState<string>(initialConversations[0]?.id ?? '')
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState('')
  const [showChatMobile, setShowChatMobile] = useState(false)
  const [newOpen, setNewOpen] = useState(false)
  const [, startTransition] = useTransition()

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return conversations
    return conversations.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.course.toLowerCase().includes(q),
    )
  }, [conversations, query])

  const active = conversations.find((c) => c.id === activeId) ?? conversations[0]

  const selectConversation = (id: string) => {
    setActiveId(id)
    setShowChatMobile(true)
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, unread: 0 } : c)),
    )
  }

  const sendMessage = () => {
    const text = draft.trim()
    if (!text || !active) return
    const convoId = active.id
    setConversations((prev) =>
      prev.map((c) =>
        c.id === convoId
          ? {
              ...c,
              lastTime: 'الآن',
              messages: [
                ...c.messages,
                {
                  id: `${c.id}-${c.messages.length + 1}`,
                  fromMe: true,
                  text,
                  time: 'الآن',
                },
              ],
            }
          : c,
      ),
    )
    setDraft('')
    startTransition(async () => {
      await sendStudentMessage(convoId, text)
    })
  }

  const totalUnread = conversations.reduce((a, c) => a + c.unread, 0)

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-foreground">الرسائل</h1>
          <p className="text-sm text-muted-foreground">
            تواصل مع فريق الدعم والإدارة بخصوص طلباتك واشتراكاتك.
          </p>
        </div>
        <Card className="flex min-h-[420px] flex-col items-center justify-center gap-3 p-8 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <MessageSquare className="size-7" />
          </div>
          <h2 className="text-lg font-bold text-foreground">لا توجد رسائل بعد</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            ابدأ محادثة مع فريق الدعم والإدارة بخصوص اشتراكاتك أو أي استفسار.
          </p>
          <Button onClick={() => setNewOpen(true)} className="mt-2">
            <Plus className="size-4" />
            محادثة جديدة
          </Button>
        </Card>

        {newOpen && (
          <NewConversationModal
            onClose={() => setNewOpen(false)}
            onCreated={() => {
              setNewOpen(false)
              router.refresh()
            }}
          />
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-foreground">الرسائل</h1>
          <p className="text-sm text-muted-foreground">
            تواصل مع محاضريك وزملائك وفريق الدعم.
            {totalUnread > 0 && (
              <span className="mr-1 font-semibold text-primary">
                {' '}
                لديك {totalUnread} رسائل غير مقروءة.
              </span>
            )}
          </p>
        </div>
        <Button onClick={() => setNewOpen(true)}>
          <Plus className="size-4" />
          محادثة جديدة
        </Button>
      </div>

      <Card className="grid h-[calc(100vh-13rem)] min-h-[520px] grid-cols-1 gap-0 overflow-hidden p-0 md:grid-cols-[320px_1fr]">
        {/* Conversations list */}
        <div
          className={cn(
            'flex min-h-0 flex-col border-l border-border',
            showChatMobile ? 'hidden md:flex' : 'flex',
          )}
        >
          <div className="border-b border-border p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ابحث في المحادثات..."
                className="h-10 w-full rounded-xl border border-border bg-secondary/60 pr-10 pl-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:bg-card"
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto scrollbar-hide">
            {filtered.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                لا توجد محادثات مطابقة.
              </p>
            ) : (
              filtered.map((c) => {
                const last = c.messages[c.messages.length - 1]
                return (
                  <button
                    key={c.id}
                    onClick={() => selectConversation(c.id)}
                    className={cn(
                      'flex w-full items-center gap-3 border-b border-border px-4 py-3 text-right transition-colors hover:bg-secondary/50',
                      c.id === activeId && 'bg-primary/5',
                    )}
                  >
                    <div className="relative shrink-0">
                      <Avatar className="size-11">
                        <AvatarImage src={c.avatar} alt={c.name} />
                        <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                          {c.initials}
                        </AvatarFallback>
                      </Avatar>
                      {c.online && (
                        <span className="absolute bottom-0 left-0 size-3 rounded-full border-2 border-card bg-emerald-500" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-bold text-foreground">
                          {c.name}
                        </span>
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {c.lastTime}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {last.fromMe ? 'أنتِ: ' : ''}
                        {last.text}
                      </p>
                    </div>
                    {c.unread > 0 && (
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                        {c.unread}
                      </span>
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Chat pane */}
        <div
          className={cn(
            'flex min-h-0 flex-col bg-secondary/20',
            showChatMobile ? 'flex' : 'hidden md:flex',
          )}
        >
          {/* Chat header */}
          <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-3">
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 text-muted-foreground md:hidden"
              onClick={() => setShowChatMobile(false)}
              aria-label="الرجوع للمحادثات"
            >
              <ArrowRight className="size-5" />
            </Button>
            <div className="relative shrink-0">
              <Avatar className="size-10">
                <AvatarImage src={active.avatar} alt={active.name} />
                <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                  {active.initials}
                </AvatarFallback>
              </Avatar>
              {active.online && (
                <span className="absolute bottom-0 left-0 size-2.5 rounded-full border-2 border-card bg-emerald-500" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-foreground">{active.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {active.online ? 'متصل الآن' : active.role} · {active.course}
              </p>
            </div>
          </div>

          {/* Messages */}
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto scrollbar-hide p-4">
            {active.messages.map((msg) => (
              <div
                key={msg.id}
                className={cn('flex', msg.fromMe ? 'justify-start' : 'justify-end')}
              >
                <div
                  className={cn(
                    'max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm',
                    msg.fromMe
                      ? 'rounded-bl-md bg-primary text-primary-foreground'
                      : 'rounded-br-md bg-card text-foreground',
                  )}
                >
                  <p>{msg.text}</p>
                  <span
                    className={cn(
                      'mt-1 flex items-center justify-end gap-1 text-[10px]',
                      msg.fromMe ? 'text-primary-foreground/70' : 'text-muted-foreground',
                    )}
                  >
                    {msg.time}
                    {msg.fromMe &&
                      (msg.time === 'الآن' ? (
                        <Check className="size-3" />
                      ) : (
                        <CheckCheck className="size-3" />
                      ))}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Composer */}
          <div className="border-t border-border bg-card p-3">
            <div className="flex items-end gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 text-muted-foreground hover:text-foreground"
                aria-label="إرفاق ملف"
              >
                <Paperclip className="size-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="hidden shrink-0 text-muted-foreground hover:text-foreground sm:flex"
                aria-label="إيموجي"
              >
                <Smile className="size-5" />
              </Button>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    sendMessage()
                  }
                }}
                rows={1}
                placeholder="اكتب رسالتك..."
                className="max-h-28 min-h-[44px] flex-1 resize-none rounded-xl border border-border bg-secondary/60 px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:bg-card"
              />
              <Button
                size="icon"
                className="size-11 shrink-0"
                onClick={sendMessage}
                disabled={!draft.trim()}
                aria-label="إرسال"
              >
                <Send className="size-5" />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {newOpen && (
        <NewConversationModal
          onClose={() => setNewOpen(false)}
          onCreated={() => {
            setNewOpen(false)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}

function NewConversationModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: () => void
}) {
  const [subject, setSubject] = useState('')
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)

  async function submit() {
    if (!text.trim()) {
      toast.error('اكتب رسالتك الأول.')
      return
    }
    setSending(true)
    const res = await startConversation(subject, text)
    setSending(false)
    if (res?.error) {
      toast.error(res.error)
      return
    }
    toast.success('تم إرسال رسالتك لفريق الدعم')
    onCreated()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="إغلاق"
        onClick={onClose}
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
      />
      <div className="relative z-10 w-full max-w-md rounded-3xl border border-border bg-background p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">محادثة جديدة</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-muted"
            aria-label="إغلاق"
          >
            <X className="size-4" />
          </button>
        </div>

        <label className="mb-1.5 block text-sm font-semibold text-foreground">
          الموضوع
        </label>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="مثال: استفسار عن اشتراك"
          className="mb-4 h-11 w-full rounded-xl border border-border bg-secondary/50 px-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:bg-background"
        />

        <label className="mb-1.5 block text-sm font-semibold text-foreground">
          رسالتك
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          placeholder="اكتب رسالتك لفريق الدعم..."
          className="mb-4 w-full resize-none rounded-xl border border-border bg-secondary/50 px-4 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:bg-background"
        />

        <div className="flex justify-start gap-2">
          <Button onClick={submit} disabled={sending}>
            {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            إرسال
          </Button>
          <Button variant="outline" type="button" onClick={onClose}>
            إلغاء
          </Button>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { Search, Send, Phone, Video, MoreVertical, ArrowRight } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { getInitials } from '@/lib/get-initials'
import { conversations, type Conversation, type ChatMessage } from '@/lib/messages-data'

export function MessagesInbox() {
  const [chats, setChats] = useState<Conversation[]>(conversations)
  const [activeId, setActiveId] = useState<string>(conversations[0]?.id ?? '')
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState('')
  const [showChat, setShowChat] = useState(false)

  const active = chats.find((c) => c.id === activeId)

  const filtered = chats.filter(
    (c) =>
      c.name.includes(query) ||
      c.course.includes(query) ||
      c.preview.includes(query),
  )

  function selectChat(id: string) {
    setActiveId(id)
    setShowChat(true)
    setChats((prev) =>
      prev.map((c) => (c.id === id ? { ...c, unread: 0 } : c)),
    )
  }

  function sendMessage() {
    const text = draft.trim()
    if (!text || !active) return
    const newMsg: ChatMessage = {
      id: `m${Date.now()}`,
      fromMe: true,
      text,
      time: 'الآن',
    }
    setChats((prev) =>
      prev.map((c) =>
        c.id === active.id
          ? { ...c, messages: [...c.messages, newMsg], preview: text, time: 'الآن' }
          : c,
      ),
    )
    setDraft('')
  }

  return (
    <Card className="grid h-[calc(100vh-16rem)] grid-cols-1 overflow-hidden p-0 md:grid-cols-[20rem_1fr]">
      {/* Conversation list */}
      <div
        className={cn(
          'flex flex-col border-l border-border bg-card',
          showChat ? 'hidden md:flex' : 'flex',
        )}
      >
        <div className="border-b border-border p-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث في المحادثات..."
              className="pr-9"
            />
          </div>
        </div>

        <ul className="flex-1 divide-y divide-border overflow-y-auto">
          {filtered.map((c) => {
            const isActive = c.id === activeId
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => selectChat(c.id)}
                  className={cn(
                    'flex w-full items-start gap-3 p-4 text-right transition-colors hover:bg-muted/50',
                    isActive && 'bg-primary/5',
                  )}
                >
                  <div className="relative shrink-0">
                    <Avatar className="size-11">
                      <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                        {getInitials(c.name)}
                      </AvatarFallback>
                    </Avatar>
                    {c.online && (
                      <span className="absolute bottom-0 left-0 size-3 rounded-full border-2 border-card bg-emerald-500" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {c.name}
                      </p>
                      <span className="whitespace-nowrap text-xs text-muted-foreground">
                        {c.time}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {c.preview}
                    </p>
                  </div>
                  {c.unread > 0 && (
                    <span className="mt-1 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                      {c.unread}
                    </span>
                  )}
                </button>
              </li>
            )
          })}
          {filtered.length === 0 && (
            <li className="p-8 text-center text-sm text-muted-foreground">
              لا توجد محادثات مطابقة
            </li>
          )}
        </ul>
      </div>

      {/* Chat panel */}
      <div className={cn('flex flex-col bg-muted/20', showChat ? 'flex' : 'hidden md:flex')}>
        {active ? (
          <>
            {/* Chat header */}
            <div className="flex items-center justify-between gap-3 border-b border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowChat(false)}
                  className="md:hidden"
                >
                  <ArrowRight className="size-5" />
                  <span className="sr-only">رجوع</span>
                </Button>
                <div className="relative">
                  <Avatar className="size-10">
                    <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                      {getInitials(active.name)}
                    </AvatarFallback>
                  </Avatar>
                  {active.online && (
                    <span className="absolute bottom-0 left-0 size-2.5 rounded-full border-2 border-card bg-emerald-500" />
                  )}
                </div>
                <div className="leading-tight">
                  <p className="text-sm font-semibold text-foreground">{active.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {active.online ? 'متصل الآن' : active.course}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Button variant="ghost" size="icon">
                  <Phone className="size-5" />
                  <span className="sr-only">اتصال</span>
                </Button>
                <Button variant="ghost" size="icon">
                  <Video className="size-5" />
                  <span className="sr-only">مكالمة فيديو</span>
                </Button>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="size-5" />
                  <span className="sr-only">المزيد</span>
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {active.messages.map((m) => (
                <div
                  key={m.id}
                  className={cn('flex', m.fromMe ? 'justify-start' : 'justify-end')}
                >
                  <div
                    className={cn(
                      'max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                      m.fromMe
                        ? 'rounded-bl-sm bg-primary text-primary-foreground'
                        : 'rounded-br-sm bg-card text-foreground shadow-sm',
                    )}
                  >
                    <p>{m.text}</p>
                    <p
                      className={cn(
                        'mt-1 text-[10px]',
                        m.fromMe ? 'text-primary-foreground/70' : 'text-muted-foreground',
                      )}
                    >
                      {m.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Composer */}
            <div className="border-t border-border bg-card p-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  sendMessage()
                }}
                className="flex items-center gap-2"
              >
                <Input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="اكتب رسالتك..."
                  className="flex-1"
                />
                <Button type="submit" size="icon" disabled={!draft.trim()}>
                  <Send className="size-4" />
                  <span className="sr-only">إرسال</span>
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            اختر محادثة لعرضها
          </div>
        )}
      </div>
    </Card>
  )
}

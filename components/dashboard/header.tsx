'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import {
  Bell,
  MessageSquare,
  Moon,
  Sun,
  Search,
  Menu,
  ChevronDown,
  Check,
  Settings,
  LogOut,
  User,
  ArrowLeft,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

/* ─── mock data ─── */
const mockMessages = [
  { id: 1, name: 'أحمد علي', text: 'متى موعد المحاضرة القادمة؟', time: 'منذ 5 د', read: false },
  { id: 2, name: 'سارة محمد', text: 'شكراً على الكورس، استفدت كتير', time: 'منذ 20 د', read: false },
  { id: 3, name: 'عمر خالد', text: 'هل يوجد تمارين إضافية؟', time: 'منذ ساعة', read: false },
  { id: 4, name: 'منى حسن', text: 'الفيديو مش بيشتغل عندي', time: 'منذ 3 س', read: true },
  { id: 5, name: 'يوسف إبراهيم', text: 'تم الاشتراك في الكورس الجديد', time: 'أمس', read: true },
]

const mockNotifications = [
  { id: 1, text: 'طالب جديد سجّل في كورس React', time: 'منذ 2 د', read: false, type: 'student' },
  { id: 2, text: 'تم استلام دفعة بقيمة 350 ج.م', time: 'منذ 15 د', read: false, type: 'payment' },
  { id: 3, text: 'تعليق جديد على درس CSS', time: 'منذ 45 د', read: false, type: 'comment' },
  { id: 4, text: 'انتهت صلاحية كوبون SUMMER30', time: 'منذ 2 س', read: true, type: 'coupon' },
  { id: 5, text: '8 طلاب أكملوا الاختبار النهائي', time: 'منذ 4 س', read: true, type: 'exam' },
  { id: 6, text: 'تحديث جديد متاح للمنصة', time: 'أمس', read: true, type: 'system' },
  { id: 7, text: 'تقرير الإيرادات الأسبوعي جاهز', time: 'أمس', read: true, type: 'report' },
  { id: 8, text: 'طالب طلب استرداد المبلغ', time: 'أمس', read: false, type: 'payment' },
]

/* ─── hook: close on outside click ─── */
function useOutsideClick(ref: React.RefObject<HTMLElement | null>, cb: () => void) {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) cb()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [ref, cb])
}

/* ─── Messages dropdown ─── */
function MessagesDropdown() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState(mockMessages)
  const ref = useRef<HTMLDivElement>(null)
  useOutsideClick(ref, () => setOpen(false))

  const unread = messages.filter((m) => !m.read).length

  const markAllRead = () => setMessages((prev) => prev.map((m) => ({ ...m, read: true })))

  return (
    <div ref={ref} className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen((v) => !v)}
        className="relative text-muted-foreground hover:text-foreground"
        aria-label="الرسائل"
        aria-expanded={open}
      >
        <MessageSquare className="size-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
            {unread}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
          {/* header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-bold text-foreground">الرسائل</span>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <Check className="size-3" />
                  تعيين الكل كمقروء
                </button>
              )}
            </div>
          </div>

          {/* list */}
          <ul className="max-h-72 overflow-y-auto divide-y divide-border">
            {messages.map((msg) => (
              <li key={msg.id}>
                <button
                  onClick={() => {
                    setMessages((prev) =>
                      prev.map((m) => (m.id === msg.id ? { ...m, read: true } : m)),
                    )
                  }}
                  className={cn(
                    'flex w-full items-start gap-3 px-4 py-3 text-right transition-colors hover:bg-secondary/60',
                    !msg.read && 'bg-primary/5',
                  )}
                >
                  <Avatar className="size-9 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                      {msg.name.slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-foreground">{msg.name}</span>
                      <span className="shrink-0 text-[11px] text-muted-foreground">{msg.time}</span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{msg.text}</p>
                  </div>
                  {!msg.read && (
                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                  )}
                </button>
              </li>
            ))}
          </ul>

          {/* footer */}
          <div className="border-t border-border px-4 py-2.5">
            <Link
              href="/messages"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              عرض كل الرسائل
              <ArrowLeft className="size-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Notifications dropdown ─── */
function NotificationsDropdown() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState(mockNotifications)
  const ref = useRef<HTMLDivElement>(null)
  useOutsideClick(ref, () => setOpen(false))

  const unread = notifications.filter((n) => !n.read).length
  const markAllRead = () => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))

  return (
    <div ref={ref} className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen((v) => !v)}
        className="relative text-muted-foreground hover:text-foreground"
        aria-label="الإشعارات"
        aria-expanded={open}
      >
        <Bell className="size-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
            {unread}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
          {/* header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-bold text-foreground">
              الإشعارات
              {unread > 0 && (
                <span className="mr-2 rounded-full bg-destructive px-2 py-0.5 text-[11px] font-bold text-white">
                  {unread}
                </span>
              )}
            </span>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Check className="size-3" />
                تعيين الكل كمقروء
              </button>
            )}
          </div>

          {/* list */}
          <ul className="max-h-72 overflow-y-auto divide-y divide-border">
            {notifications.map((n) => (
              <li key={n.id}>
                <button
                  onClick={() =>
                    setNotifications((prev) =>
                      prev.map((item) => (item.id === n.id ? { ...item, read: true } : item)),
                    )
                  }
                  className={cn(
                    'flex w-full items-start gap-3 px-4 py-3 text-right transition-colors hover:bg-secondary/60',
                    !n.read && 'bg-primary/5',
                  )}
                >
                  <div
                    className={cn(
                      'mt-0.5 size-2 shrink-0 rounded-full',
                      !n.read ? 'bg-primary' : 'bg-transparent',
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground leading-snug">{n.text}</p>
                    <span className="mt-0.5 text-[11px] text-muted-foreground">{n.time}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>

          {/* footer */}
          <div className="border-t border-border px-4 py-2.5">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              عرض كل الإشعارات
              <ArrowLeft className="size-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Profile dropdown ─── */
function ProfileDropdown({ isDark, onToggleTheme }: { isDark: boolean; onToggleTheme: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useOutsideClick(ref, () => setOpen(false))

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-xl p-1 transition-colors hover:bg-secondary/60"
        aria-expanded={open}
        aria-label="قائمة الحساب"
      >
        <Avatar className="size-10 ring-2 ring-primary/20">
          <AvatarFallback className="bg-primary/10 font-semibold text-primary">
            م أ
          </AvatarFallback>
        </Avatar>
        <div className="hidden leading-tight sm:block">
          <p className="text-sm font-bold text-foreground">محمد أحمد</p>
          <p className="text-xs text-muted-foreground">مدير المنصة</p>
        </div>
        <ChevronDown
          className={cn(
            'hidden size-4 text-muted-foreground transition-transform sm:block',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
          {/* user info */}
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-bold text-foreground">محمد أحمد</p>
            <p className="text-xs text-muted-foreground">admin@platform.com</p>
          </div>

          {/* menu items */}
          <div className="py-1.5">
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-secondary/60"
            >
              <User className="size-4 text-muted-foreground" />
              الملف الشخصي
            </Link>
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-secondary/60"
            >
              <Settings className="size-4 text-muted-foreground" />
              الإعدادات
            </Link>
            <button
              onClick={() => { onToggleTheme(); setOpen(false) }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-secondary/60"
            >
              {isDark ? (
                <Sun className="size-4 text-muted-foreground" />
              ) : (
                <Moon className="size-4 text-muted-foreground" />
              )}
              {isDark ? 'الوضع الفاتح' : 'الوضع الداكن'}
            </button>
          </div>

          <div className="border-t border-border py-1.5">
            <button className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-destructive transition-colors hover:bg-destructive/10">
              <LogOut className="size-4" />
              تسجيل الخروج
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Main Header ─── */
export function Header({
  onMenuClick,
  isDark,
  onToggleTheme,
}: {
  onMenuClick: () => void
  isDark: boolean
  onToggleTheme: () => void
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur">
      <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
        {/* Profile */}
        <ProfileDropdown isDark={isDark} onToggleTheme={onToggleTheme} />

        {/* Icon actions */}
        <div className="flex items-center gap-1">
          <NotificationsDropdown />
          <MessagesDropdown />
        </div>

        {/* Search */}
        <div className="relative mx-auto hidden w-full max-w-xl md:block">
          <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="ابحث عن طالب، كورس، درس، دفعة..."
            className="h-11 w-full rounded-xl border border-border bg-secondary/60 pr-10 pl-16 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:bg-card"
          />
          <kbd className="absolute left-3 top-1/2 -translate-y-1/2 rounded-md border border-border bg-card px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            Ctrl K
          </kbd>
        </div>

        {/* Menu toggle - only visible on mobile */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="mr-auto text-foreground md:hidden"
        >
          <Menu className="size-6" />
          <span className="sr-only">فتح القائمة</span>
        </Button>
      </div>
    </header>
  )
}

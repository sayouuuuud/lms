'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { markAsRead, markAllAsRead, deleteNotification } from '@/app/notifications/actions'
import {
  Bell,
  BellRing,
  Check,
  CreditCard,
  FileText,
  GraduationCap,
  MessageSquare,
  Settings,
  Trash2,
  Users,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { NotificationsPageHeader } from './notifications-page-header'
import {
  notificationTypeFilters,
  type NotificationRecord,
  type NotificationType,
} from '@/lib/notifications-data'

const typeStyles: Record<
  NotificationType,
  { icon: typeof Bell; color: string; bg: string }
> = {
  طالب: { icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
  دفع: {
    icon: CreditCard,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
  },
  اختبار: {
    icon: FileText,
    color: 'text-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-500/10',
  },
  كورس: {
    icon: GraduationCap,
    color: 'text-amber-600',
    bg: 'bg-amber-50 dark:bg-amber-500/10',
  },
  رسالة: {
    icon: MessageSquare,
    color: 'text-violet-600',
    bg: 'bg-violet-50 dark:bg-violet-500/10',
  },
  نظام: {
    icon: Settings,
    color: 'text-muted-foreground',
    bg: 'bg-secondary',
  },
}

export function NotificationsFeed({
  initialNotifications
}: {
  initialNotifications: NotificationRecord[]
}) {
  const router = useRouter()
  const [items, setItems] = useState<NotificationRecord[]>(initialNotifications)
  const [filter, setFilter] = useState<NotificationType | 'الكل'>('الكل')
  const [onlyUnread, setOnlyUnread] = useState(false)

  const unreadCount = useMemo(
    () => items.filter((n) => !n.read).length,
    [items],
  )

  const filtered = useMemo(() => {
    return items.filter((n) => {
      const matchesType = filter === 'الكل' || n.type === filter
      const matchesRead = !onlyUnread || !n.read
      return matchesType && matchesRead
    })
  }, [items, filter, onlyUnread])

  const markAllRead = async () => {
    if (unreadCount === 0) return
    const original = [...items]
    setItems((prev) => prev.map((n) => ({ ...n, read: true })))
    const res = await markAllAsRead()
    if (res.error) {
      toast.error(res.error)
      setItems(original)
    } else {
      toast.success('تم تعليم جميع الإشعارات كمقروءة')
      router.refresh()
    }
  }

  const toggleRead = async (id: string) => {
    const original = [...items]
    const notification = items.find(n => n.id === id)
    if (!notification) return

    if (!notification.read) {
      setItems((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      )
      const res = await markAsRead(id)
      if (res.error) {
        toast.error(res.error)
        setItems(original)
      } else {
        router.refresh()
      }
    }
  }

  const remove = async (id: string) => {
    const original = [...items]
    setItems((prev) => prev.filter((n) => n.id !== id))
    const res = await deleteNotification(id)
    if (res.error) {
      toast.error(res.error)
      setItems(original)
    } else {
      toast.success('تم حذف الإشعار')
      router.refresh()
    }
  }

  return (
    <>
      <NotificationsPageHeader
        onMarkAllRead={markAllRead}
        unreadCount={unreadCount}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Card className="gap-0 p-5">
          <div className="flex items-start justify-between">
            <p className="text-sm text-muted-foreground">إجمالي الإشعارات</p>
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
              <Bell className="size-5 text-primary" />
            </div>
          </div>
          <span className="mt-3 text-2xl font-bold text-foreground">
            {items.length}
          </span>
        </Card>
        <Card className="gap-0 p-5">
          <div className="flex items-start justify-between">
            <p className="text-sm text-muted-foreground">غير مقروءة</p>
            <div className="flex size-10 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-500/10">
              <BellRing className="size-5 text-rose-600" />
            </div>
          </div>
          <span className="mt-3 text-2xl font-bold text-foreground">
            {unreadCount}
          </span>
        </Card>
        <Card className="col-span-2 gap-0 p-5 lg:col-span-1">
          <div className="flex items-start justify-between">
            <p className="text-sm text-muted-foreground">مقروءة</p>
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-500/10">
              <Check className="size-5 text-emerald-600" />
            </div>
          </div>
          <span className="mt-3 text-2xl font-bold text-foreground">
            {items.length - unreadCount}
          </span>
        </Card>
      </div>

      {/* List */}
      <Card className="gap-0 p-5">
        {/* Toolbar */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {notificationTypeFilters.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setFilter(item.value)}
                className={cn(
                  'rounded-lg border px-4 py-2 text-xs font-semibold transition-colors',
                  filter === item.value
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-secondary/60 text-muted-foreground hover:bg-secondary',
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setOnlyUnread((v) => !v)}
            className={cn(
              'shrink-0 rounded-lg border px-4 py-2 text-xs font-semibold transition-colors',
              onlyUnread
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-secondary/60 text-muted-foreground hover:bg-secondary',
            )}
          >
            غير المقروءة فقط
          </button>
        </div>

        {/* Items */}
        <ul className="mt-5 space-y-2">
          {filtered.map((n) => {
            const style = typeStyles[n.type]
            return (
              <li
                key={n.id}
                className={cn(
                  'group flex items-start gap-3 rounded-xl border p-4 transition-colors',
                  n.read
                    ? 'border-border bg-card'
                    : 'border-primary/20 bg-primary/5',
                )}
              >
                <div
                  className={cn(
                    'flex size-10 shrink-0 items-center justify-center rounded-xl',
                    style.bg,
                  )}
                >
                  <style.icon className={cn('size-5', style.color)} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-foreground">
                      {n.title}
                      {!n.read && (
                        <span className="mr-2 inline-block size-2 rounded-full bg-primary align-middle" />
                      )}
                    </p>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {n.time}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {n.description}
                  </p>

                  <div className="mt-2 flex gap-2 opacity-100 lg:opacity-0 lg:transition-opacity lg:group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => toggleRead(n.id)}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      {n.read ? 'تعليم كغير مقروء' : 'تعليم كمقروء'}
                    </button>
                    <span className="text-muted-foreground">·</span>
                    <button
                      type="button"
                      onClick={() => remove(n.id)}
                      className="flex items-center gap-1 text-xs font-semibold text-destructive hover:underline"
                    >
                      <Trash2 className="size-3.5" />
                      حذف
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-14 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-secondary">
              <Bell className="size-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              لا توجد إشعارات في هذا التصنيف
            </p>
          </div>
        )}
      </Card>
    </>
  )
}

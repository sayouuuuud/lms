'use client'

import { useMemo, useState } from 'react'
import {
  BookOpenCheck,
  CalendarClock,
  CalendarDays,
  Clock,
  ClipboardList,
  FileText,
  MapPin,
  Radio,
  User,
  Video,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  weekDays,
  weeklySchedule,
  type SessionItem,
  type SessionType,
  type WeekDay,
} from '@/lib/student-data'

const TODAY: WeekDay = 'السبت'

const typeConfig: Record<
  SessionType,
  { icon: typeof Video; badge: string; accent: string; bar: string }
> = {
  محاضرة: {
    icon: Video,
    badge: 'bg-primary/15 text-primary',
    accent: 'bg-primary/10 text-primary',
    bar: 'bg-primary',
  },
  اختبار: {
    icon: ClipboardList,
    badge: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
    accent: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400',
    bar: 'bg-rose-500',
  },
  واجب: {
    icon: FileText,
    badge: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    accent: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
    bar: 'bg-amber-500',
  },
  مراجعة: {
    icon: BookOpenCheck,
    badge: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    accent: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
    bar: 'bg-emerald-500',
  },
  مباشر: {
    icon: Radio,
    badge: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
    accent: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400',
    bar: 'bg-blue-500',
  },
}

function SessionCard({ session }: { session: SessionItem }) {
  const cfg = typeConfig[session.type]
  const Icon = cfg.icon

  return (
    <Card className="group relative gap-0 overflow-hidden p-0 transition-shadow hover:shadow-md hover:border-primary/40">
      <span className={cn('absolute inset-y-0 right-0 w-1', cfg.bar)} />
      <div className="flex items-start gap-3 p-4 pr-5">
        <div
          className={cn(
            'flex size-11 shrink-0 items-center justify-center rounded-xl',
            cfg.accent,
          )}
        >
          <Icon className="size-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-semibold',
                cfg.badge,
              )}
            >
              {session.type}
            </span>
            {session.isLive && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-rose-500/15 px-2 py-0.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                <span className="size-1.5 animate-pulse rounded-full bg-rose-500" />
                مباشر الآن
              </span>
            )}
          </div>

          <h3 className="mt-1.5 line-clamp-1 text-sm font-bold text-foreground">
            {session.title}
          </h3>
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
            {session.course}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Clock className="size-3.5" />
              {session.startTime}
              {session.endTime !== session.startTime && ` - ${session.endTime}`}
            </span>
            <span className="flex items-center gap-1.5">
              <User className="size-3.5" />
              {session.instructor}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="size-3.5" />
              {session.location}
            </span>
          </div>
        </div>

        <Button
          size="sm"
          variant={session.isLive ? 'default' : 'secondary'}
          className="shrink-0 self-center"
        >
          {session.isLive ? 'انضم الآن' : 'التفاصيل'}
        </Button>
      </div>
    </Card>
  )
}

export function StudentSchedulePage() {
  const [activeDay, setActiveDay] = useState<WeekDay>(TODAY)

  const sessionsByDay = useMemo(() => {
    const map = new Map<WeekDay, SessionItem[]>()
    for (const day of weekDays) {
      map.set(
        day,
        weeklySchedule.filter((s) => s.day === day),
      )
    }
    return map
  }, [])

  const daySessions = sessionsByDay.get(activeDay) ?? []

  const totalSessions = weeklySchedule.length
  const liveCount = weeklySchedule.filter((s) => s.isLive).length
  const examsCount = weeklySchedule.filter((s) => s.type === 'اختبار').length
  const todayCount = sessionsByDay.get(TODAY)?.length ?? 0

  const stats = [
    {
      label: 'جلسات هذا الأسبوع',
      value: String(totalSessions),
      sub: 'موزعة على الأيام',
      icon: CalendarDays,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: 'جلسات اليوم',
      value: String(todayCount),
      sub: TODAY,
      icon: CalendarClock,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    },
    {
      label: 'بث مباشر',
      value: String(liveCount),
      sub: 'جلسات تفاعلية',
      icon: Radio,
      color: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-500/10',
    },
    {
      label: 'اختبارات مجدولة',
      value: String(examsCount),
      sub: 'خلال الأسبوع',
      icon: ClipboardList,
      color: 'text-rose-600',
      bg: 'bg-rose-50 dark:bg-rose-500/10',
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-foreground">جدولي</h1>
        <p className="text-sm text-muted-foreground">
          نظّم أسبوعك الدراسي وتابع مواعيد محاضراتك واختباراتك وجلساتك المباشرة.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card
            key={stat.label}
            className="gap-0 p-5 transition-shadow hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <div
                className={cn(
                  'flex size-10 items-center justify-center rounded-xl',
                  stat.bg,
                )}
              >
                <stat.icon className={cn('size-5', stat.color)} />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-2xl font-bold text-foreground">
                {stat.value}
              </span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{stat.sub}</p>
          </Card>
        ))}
      </div>

      {/* Week navigator + sessions */}
      <Card className="gap-0 p-5">
        <div className="flex flex-col gap-1 border-b border-border pb-4">
          <h2 className="text-base font-bold text-foreground">
            الجدول الأسبوعي
          </h2>
          <p className="text-xs text-muted-foreground">
            اختر يوماً لعرض جلساته
          </p>
        </div>

        {/* Day tabs */}
        <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-7">
          {weekDays.map((day) => {
            const count = sessionsByDay.get(day)?.length ?? 0
            const isActive = day === activeDay
            const isToday = day === TODAY
            return (
              <button
                key={day}
                type="button"
                onClick={() => setActiveDay(day)}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-center transition-colors',
                  isActive
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-secondary/60 text-muted-foreground hover:bg-secondary',
                )}
              >
                <span className="text-xs font-semibold">{day}</span>
                <span
                  className={cn(
                    'flex size-6 items-center justify-center rounded-full text-[11px] font-bold',
                    isActive
                      ? 'bg-primary-foreground/20 text-primary-foreground'
                      : count > 0
                        ? 'bg-primary/15 text-primary'
                        : 'bg-transparent text-muted-foreground',
                  )}
                >
                  {count}
                </span>
                {isToday && (
                  <span
                    className={cn(
                      'text-[10px] font-medium',
                      isActive ? 'text-primary-foreground/80' : 'text-emerald-600',
                    )}
                  >
                    اليوم
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Sessions for active day */}
        <div className="mt-5">
          {daySessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <CalendarDays className="size-10 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">
                لا توجد جلسات في يوم {activeDay}
              </p>
              <p className="text-xs text-muted-foreground">
                استمتع بيوم راحتك أو راجع دروسك السابقة.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {daySessions.map((session) => (
                <SessionCard key={session.id} session={session} />
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

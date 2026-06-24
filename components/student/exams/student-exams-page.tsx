'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  AlarmClock,
  Award,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileQuestion,
  ListChecks,
  Play,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { exams, type Exam, type ExamStatus } from '@/lib/student-exams-data'

type Filter = 'all' | ExamStatus

const filters: { key: Filter; label: string }[] = [
  { key: 'all', label: 'الكل' },
  { key: 'متاح', label: 'متاحة الآن' },
  { key: 'قادم', label: 'قادمة' },
  { key: 'مكتمل', label: 'مكتملة' },
]

const statusConfig: Record<
  ExamStatus,
  { label: string; badge: string; icon: typeof Clock }
> = {
  متاح: {
    label: 'متاح الآن',
    badge: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    icon: AlarmClock,
  },
  قادم: {
    label: 'قادم',
    badge: 'bg-primary/15 text-primary',
    icon: CalendarClock,
  },
  مكتمل: {
    label: 'مكتمل',
    badge: 'bg-muted text-muted-foreground',
    icon: CheckCircle2,
  },
}

function ExamCard({ exam }: { exam: Exam }) {
  const cfg = statusConfig[exam.status]
  const StatusIcon = cfg.icon
  const percent =
    exam.score != null ? Math.round((exam.score / exam.totalPoints) * 100) : null
  const passed = percent != null && percent >= exam.passingPercent

  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <ClipboardList className="size-5" />
        </div>
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold',
            cfg.badge,
          )}
        >
          <StatusIcon className="size-3.5" />
          {cfg.label}
        </span>
      </div>

      <h3 className="mt-4 line-clamp-2 text-base font-bold leading-snug text-foreground">
        {exam.title}
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">{exam.course}</p>

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <FileQuestion className="size-3.5" />
          {exam.questions.length} أسئلة
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="size-3.5" />
          {exam.durationMinutes} دقيقة
        </span>
        <span className="flex items-center gap-1.5">
          <Award className="size-3.5" />
          {exam.totalPoints} نقطة
        </span>
        <span className="flex items-center gap-1.5">
          <CalendarClock className="size-3.5" />
          {exam.date}
        </span>
      </div>

      {exam.status === 'مكتمل' && percent != null && (
        <div className="mt-4 rounded-xl border border-border p-3">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="font-medium text-foreground">نتيجتك</span>
            <span
              className={cn(
                'font-bold',
                passed
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-destructive',
              )}
            >
              {exam.score}/{exam.totalPoints} ({percent}%)
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className={cn(
                'h-full rounded-full',
                passed ? 'bg-emerald-500' : 'bg-destructive',
              )}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      )}

      <div className="mt-auto pt-4">
        {exam.status === 'قادم' ? (
          <Button variant="secondary" className="w-full" disabled>
            <Clock className="size-4" />
            لم يبدأ بعد
          </Button>
        ) : (
          <Button
            className="w-full"
            variant={exam.status === 'مكتمل' ? 'outline' : 'default'}
            render={<Link href={`/student/exams/${exam.id}`} />}
          >
            {exam.status === 'مكتمل' ? (
              <>
                <ListChecks className="size-4" />
                مراجعة الإجابات
              </>
            ) : (
              <>
                <Play className="size-4" />
                بدء الاختبار
              </>
            )}
          </Button>
        )}
      </div>
    </Card>
  )
}

export function StudentExamsPage() {
  const [filter, setFilter] = useState<Filter>('all')

  const filtered = exams.filter((e) => filter === 'all' || e.status === filter)

  const available = exams.filter((e) => e.status === 'متاح').length
  const upcoming = exams.filter((e) => e.status === 'قادم').length
  const completed = exams.filter((e) => e.status === 'مكتمل')
  const avgScore =
    completed.length > 0
      ? Math.round(
          completed.reduce(
            (a, e) => a + ((e.score ?? 0) / e.totalPoints) * 100,
            0,
          ) / completed.length,
        )
      : 0

  const stats = [
    { label: 'متاحة الآن', value: available, icon: AlarmClock },
    { label: 'اختبارات قادمة', value: upcoming, icon: CalendarClock },
    { label: 'مكتملة', value: completed.length, icon: CheckCircle2 },
    { label: 'متوسط الدرجات', value: `${avgScore}%`, icon: Award },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-foreground">الاختبارات</h1>
        <p className="text-sm text-muted-foreground">
          تابع اختباراتك المتاحة والقادمة، وراجع نتائج اختباراتك السابقة.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="flex flex-row items-center gap-4 p-5">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <s.icon className="size-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-sm text-muted-foreground">{s.label}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cn(
              'rounded-xl px-4 py-2 text-sm font-medium transition-colors',
              filter === f.key
                ? 'bg-primary text-primary-foreground'
                : 'border border-border bg-card text-muted-foreground hover:bg-secondary',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-2 py-16 text-center">
          <ClipboardList className="size-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            لا توجد اختبارات في هذا التصنيف.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((exam) => (
            <ExamCard key={exam.id} exam={exam} />
          ))}
        </div>
      )}
    </div>
  )
}

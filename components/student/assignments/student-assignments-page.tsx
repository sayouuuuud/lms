'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Award,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ClipboardList,
  Clock,
  FileText,
  Hourglass,
  ListChecks,
  Pencil,
  Search,
  Send,
  TrendingUp,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  assignments,
  courseDetails,
  type Assignment,
  type AssignmentStatus,
  type AssignmentType,
} from '@/lib/student-courses-data'

// -------- types & config --------

type StatusFilter = 'all' | AssignmentStatus
type TypeFilter = 'all' | AssignmentType

const statusFilters: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'الكل' },
  { key: 'لم يبدأ', label: 'لم تبدأ' },
  { key: 'قيد التنفيذ', label: 'قيد التنفيذ' },
  { key: 'تم التسليم', label: 'تم التسليم' },
  { key: 'مصحّح', label: 'مصحّحة' },
]

const typeFilters: { key: TypeFilter; label: string }[] = [
  { key: 'all', label: 'الكل' },
  { key: 'تسليم', label: 'واجبات' },
  { key: 'اختبار', label: 'اختبارات قصيرة' },
]

const statusConfig: Record<
  AssignmentStatus,
  { badge: string; bar: string; icon: typeof Clock; label: string }
> = {
  'لم يبدأ': {
    badge: 'bg-secondary text-muted-foreground',
    bar: 'bg-muted-foreground/40',
    icon: Clock,
    label: 'لم يبدأ',
  },
  'قيد التنفيذ': {
    badge: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    bar: 'bg-amber-500',
    icon: Hourglass,
    label: 'قيد التنفيذ',
  },
  'تم التسليم': {
    badge: 'bg-primary/15 text-primary',
    bar: 'bg-primary',
    icon: Send,
    label: 'تم التسليم',
  },
  'مصحّح': {
    badge: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    bar: 'bg-emerald-500',
    icon: CheckCircle2,
    label: 'مصحّح',
  },
}

const typeConfig: Record<
  AssignmentType,
  { icon: typeof FileText; accent: string; iconColor: string }
> = {
  تسليم: {
    icon: FileText,
    accent: 'bg-primary/10',
    iconColor: 'text-primary',
  },
  اختبار: {
    icon: ClipboardList,
    accent: 'bg-violet-500/10',
    iconColor: 'text-violet-600 dark:text-violet-400',
  },
}

// -------- helpers --------

function getCourseTitle(courseId: string): string {
  return courseDetails.find((c) => c.id === courseId)?.title ?? 'كورس غير معروف'
}

function isOverdue(dueDate: string): boolean {
  // Simple check: if the assignment is not submitted/corrected, flag as overdue
  // dueDate is in Arabic format like "26 يونيو 2024" - we just flag "لم يبدأ" as needing attention
  return false
}

// -------- card --------

function AssignmentCard({ assignment }: { assignment: Assignment }) {
  const sCfg = statusConfig[assignment.status]
  const tCfg = typeConfig[assignment.type]
  const StatusIcon = sCfg.icon
  const TypeIcon = tCfg.icon
  const courseTitle = getCourseTitle(assignment.courseId)
  const hasScore = assignment.score != null
  const percent = hasScore
    ? Math.round((assignment.score! / assignment.points) * 100)
    : null
  const passed = percent != null && percent >= 60

  return (
    <Card className="group flex flex-col gap-0 overflow-hidden p-0 transition-all hover:border-primary/40 hover:shadow-md">
      {/* Top accent strip */}
      <div className={cn('h-1 w-full', sCfg.bar)} />

      {/* Header row */}
      <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
        <div
          className={cn(
            'flex size-11 shrink-0 items-center justify-center rounded-xl',
            tCfg.accent,
          )}
        >
          <TypeIcon className={cn('size-5', tCfg.iconColor)} />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold',
              sCfg.badge,
            )}
          >
            <StatusIcon className="size-3.5" />
            {sCfg.label}
          </span>
          <span className="rounded-md bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            {assignment.type}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col px-5 pb-5">
        <h3 className="line-clamp-2 text-base font-bold leading-snug text-foreground text-balance">
          {assignment.title}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">{courseTitle}</p>

        {/* Meta grid */}
        <div className="mt-4 grid grid-cols-2 gap-y-2.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <CalendarClock className="size-3.5 shrink-0" />
            <span className="truncate">{assignment.dueDate}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Award className="size-3.5 shrink-0" />
            {assignment.points} نقطة
          </span>
          {assignment.type === 'اختبار' && assignment.questions && (
            <span className="flex items-center gap-1.5">
              <ListChecks className="size-3.5 shrink-0" />
              {assignment.questions.length} أسئلة
            </span>
          )}
          {assignment.attachments.length > 0 && (
            <span className="flex items-center gap-1.5">
              <FileText className="size-3.5 shrink-0" />
              {assignment.attachments.length} مرفق
            </span>
          )}
        </div>

        {/* Score bar or due-date box */}
        {assignment.status === 'مصحّح' && percent != null ? (
          <div className="mt-4 rounded-xl bg-secondary/60 p-3">
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
                {assignment.score}/{assignment.points} ({percent}%)
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-background">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  passed ? 'bg-emerald-500' : 'bg-destructive',
                )}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="mt-4 flex items-center gap-1.5 rounded-xl bg-secondary/60 px-3 py-2.5 text-xs">
            <CalendarClock className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="text-muted-foreground">الموعد النهائي:</span>
            <span className="font-semibold text-foreground">{assignment.dueDate}</span>
          </div>
        )}

        {/* CTA */}
        <div className="mt-4 border-t border-border pt-4">
          {assignment.status === 'تم التسليم' ? (
            <Button variant="secondary" className="w-full" disabled>
              <CheckCircle2 className="size-4" />
              بانتظار التصحيح
            </Button>
          ) : (
            <Button
              className="w-full"
              variant={assignment.status === 'مصحّح' ? 'outline' : 'default'}
              render={<Link href={`/student/assignments/${assignment.id}`} />}
            >
              {assignment.status === 'مصحّح' ? (
                <>
                  <ListChecks className="size-4" />
                  عرض التصحيح
                </>
              ) : assignment.status === 'قيد التنفيذ' ? (
                <>
                  <Pencil className="size-4" />
                  متابعة التسليم
                </>
              ) : (
                <>
                  <ChevronLeft className="size-4" />
                  فتح الواجب
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}

// -------- main page --------

export function StudentAssignmentsPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return assignments.filter((a) => {
      const matchesStatus = statusFilter === 'all' || a.status === statusFilter
      const matchesType = typeFilter === 'all' || a.type === typeFilter
      const matchesQuery =
        q === '' ||
        a.title.toLowerCase().includes(q) ||
        getCourseTitle(a.courseId).toLowerCase().includes(q)
      return matchesStatus && matchesType && matchesQuery
    })
  }, [statusFilter, typeFilter, query])

  // stats
  const notStarted = assignments.filter((a) => a.status === 'لم يبدأ').length
  const inProgress = assignments.filter((a) => a.status === 'قيد التنفيذ').length
  const submitted = assignments.filter(
    (a) => a.status === 'تم التسليم' || a.status === 'مصحّح',
  ).length
  const corrected = assignments.filter((a) => a.status === 'مصحّح')
  const avgScore =
    corrected.length > 0
      ? Math.round(
          corrected.reduce(
            (acc, a) => acc + ((a.score ?? 0) / a.points) * 100,
            0,
          ) / corrected.length,
        )
      : 0

  const stats = [
    {
      label: 'لم تبدأ',
      value: String(notStarted),
      sub: 'تحتاج إلى بدء',
      icon: Clock,
      color: 'text-muted-foreground',
      bg: 'bg-secondary',
    },
    {
      label: 'قيد التنفيذ',
      value: String(inProgress),
      sub: 'يجب الإنهاء قريباً',
      icon: Hourglass,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-500/10',
    },
    {
      label: 'تم التسليم',
      value: String(submitted),
      sub: 'مسلّمة أو مصحّحة',
      icon: CheckCircle2,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    },
    {
      label: 'متوسط الدرجات',
      value: corrected.length > 0 ? `${avgScore}%` : '—',
      sub: 'في الواجبات المصحّحة',
      icon: Award,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-500/10',
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-foreground">الواجبات</h1>
        <p className="text-sm text-muted-foreground">
          تابع واجباتك وتسليماتك ونتائج التصحيح من مدرّبيك.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="gap-0 p-5 transition-shadow hover:shadow-md">
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
            <div className="mt-3">
              <span className="text-2xl font-bold text-foreground">{stat.value}</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{stat.sub}</p>
          </Card>
        ))}
      </div>

      {/* Toolbar + grid inside one card */}
      <Card className="gap-0 p-5">
        {/* Search + filters */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {/* Search */}
            <div className="relative w-full lg:max-w-sm">
              <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ابحث باسم الواجب أو الكورس..."
                className="h-11 w-full rounded-xl border border-border bg-secondary/60 pr-10 pl-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:bg-card"
              />
            </div>

            {/* Type filter */}
            <div className="flex flex-wrap gap-2">
              {typeFilters.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setTypeFilter(f.key)}
                  className={cn(
                    'rounded-lg border px-4 py-2 text-xs font-semibold transition-colors',
                    typeFilter === f.key
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-secondary/60 text-muted-foreground hover:bg-secondary',
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Status filter */}
          <div className="flex flex-wrap gap-2">
            {statusFilters.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setStatusFilter(f.key)}
                className={cn(
                  'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                  statusFilter === f.key
                    ? 'border-foreground/20 bg-foreground text-background'
                    : 'border-border bg-secondary/40 text-muted-foreground hover:bg-secondary',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-secondary">
              <FileText className="size-7 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">لا توجد واجبات مطابقة</p>
            <p className="text-xs text-muted-foreground">
              جرّب تغيير الفلاتر أو مسح البحث
            </p>
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((a) => (
              <AssignmentCard key={a.id} assignment={a} />
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
          <span>
            عرض{' '}
            <strong className="text-foreground">{filtered.length}</strong> من أصل{' '}
            <strong className="text-foreground">{assignments.length}</strong> واجب
          </span>
          {corrected.length > 0 && (
            <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="size-3.5" />
              {avgScore}% متوسط درجاتك
            </span>
          )}
        </div>
      </Card>
    </div>
  )
}

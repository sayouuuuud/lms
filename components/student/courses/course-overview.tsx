'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock,
  FileText,
  Lock,
  Play,
  PlayCircle,
  Star,
  Users,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  getCourseLessons,
  getCourseAssignments,
  type CourseDetail,
  type Lesson,
  type Section,
} from '@/lib/student-courses-data'

const lessonIcon = (lesson: Lesson) => {
  if (lesson.completed) return CheckCircle2
  if (lesson.locked) return Lock
  if (lesson.type === 'مقال') return FileText
  return PlayCircle
}

function CurriculumSection({
  courseId,
  section,
  defaultOpen,
}: {
  courseId: string
  section: Section
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen ?? false)
  const { title, lessons, assignment } = section
  const done = lessons.filter((l) => l.completed).length
  const assignmentLocked = !lessons.every((l) => l.completed)

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 bg-secondary/50 px-4 py-3 text-right transition-colors hover:bg-secondary"
      >
        <div className="flex items-center gap-3">
          <ChevronDown
            className={cn(
              'size-4 shrink-0 text-muted-foreground transition-transform',
              open && 'rotate-180',
            )}
          />
          <span className="text-sm font-bold text-foreground">{title}</span>
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">
          {done}/{lessons.length} درس{assignment ? ' • مهمة' : ''}
        </span>
      </button>

      {open && (
        <ul className="divide-y divide-border">
          {lessons.map((lesson) => {
            const Icon = lessonIcon(lesson)
            const content = (
              <div
                className={cn(
                  'flex items-center gap-3 px-4 py-3 transition-colors',
                  lesson.locked
                    ? 'cursor-not-allowed opacity-60'
                    : 'hover:bg-secondary/40',
                )}
              >
                <Icon
                  className={cn(
                    'size-5 shrink-0',
                    lesson.completed
                      ? 'text-primary'
                      : lesson.locked
                        ? 'text-muted-foreground'
                        : 'text-foreground',
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {lesson.title}
                  </p>
                  <span className="text-xs text-muted-foreground">{lesson.type}</span>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {lesson.duration}
                </span>
              </div>
            )
            return (
              <li key={lesson.id}>
                {lesson.locked ? (
                  content
                ) : (
                  <Link href={`/student/courses/${courseId}/lessons/${lesson.id}`}>
                    {content}
                  </Link>
                )}
              </li>
            )
          })}

          {assignment && (
            <li>
              {(() => {
                const content = (
                  <div
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 transition-colors',
                      assignmentLocked
                        ? 'cursor-not-allowed opacity-60'
                        : 'hover:bg-primary/5',
                    )}
                  >
                    {assignmentLocked ? (
                      <Lock className="size-5 shrink-0 text-muted-foreground" />
                    ) : assignment.type === 'اختبار' ? (
                      <ClipboardList className="size-5 shrink-0 text-primary" />
                    ) : (
                      <FileText className="size-5 shrink-0 text-primary" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {assignment.title}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {assignment.type === 'اختبار' ? 'اختبار الوحدة' : 'واجب الوحدة'}
                        {assignmentLocked && ' • أكمل دروس الوحدة لفتحه'}
                      </span>
                    </div>
                    <span className="shrink-0 text-xs font-medium text-muted-foreground">
                      {assignment.points} نقطة
                    </span>
                  </div>
                )
                return assignmentLocked ? (
                  content
                ) : (
                  <Link href={`/student/assignments/${assignment.id}`}>{content}</Link>
                )
              })()}
            </li>
          )}
        </ul>
      )}
    </div>
  )
}

export function CourseOverview({ course }: { course: CourseDetail }) {
  const percent = Math.round((course.completedLessons / course.totalLessons) * 100)
  const allLessons = getCourseLessons(course)
  const nextLesson =
    allLessons.find((l) => !l.completed && !l.locked) ?? allLessons[0]
  const courseAssignments = getCourseAssignments(course.id)

  const meta = [
    { icon: Star, label: `${course.rating} تقييم` },
    { icon: Users, label: `${course.studentsCount.toLocaleString('ar-EG')} طالب` },
    { icon: Clock, label: `${course.durationHours} ساعة` },
    { icon: BookOpen, label: `${course.totalLessons} درس` },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <Link
        href="/student/courses"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowRight className="size-4" />
        العودة إلى كورساتي
      </Link>

      {/* Hero */}
      <Card className="flex flex-col gap-6 p-6 lg:flex-row">
        <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-xl lg:w-80">
          <Image
            src={course.image || '/placeholder.svg'}
            alt={course.title}
            fill
            sizes="(max-width: 1024px) 100vw, 320px"
            className="object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <div className="flex size-14 items-center justify-center rounded-full bg-white/90 text-sidebar">
              <Play className="size-6 fill-current" />
            </div>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-xs font-semibold text-primary">{course.category}</span>
          <h1 className="mt-1 text-2xl font-bold leading-snug text-foreground text-balance">
            {course.title}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {course.description}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            {meta.map((m) => (
              <span key={m.label} className="flex items-center gap-1.5">
                <m.icon
                  className={cn(
                    'size-4',
                    m.icon === Star && 'fill-amber-400 text-amber-400',
                  )}
                />
                {m.label}
              </span>
            ))}
          </div>

          <div className="mt-auto pt-5">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">{percent}% مكتمل</span>
              <span className="text-muted-foreground">
                {course.completedLessons} من {course.totalLessons} درس
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${percent}%` }}
              />
            </div>
            <Button
              className="mt-4 w-fit"
              render={
                <Link
                  href={`/student/courses/${course.id}/lessons/${nextLesson.id}`}
                />
              }
            >
              <Play className="size-4" />
              {percent === 0 ? 'ابدأ الكورس' : 'متابعة الدرس'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Body */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* What you learn */}
          <Card className="p-6">
            <h2 className="mb-4 text-lg font-bold text-foreground">ماذا ستتعلّم</h2>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {course.whatYouLearn.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-foreground">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </Card>

          {/* Curriculum */}
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">محتوى الكورس</h2>
              <span className="text-xs text-muted-foreground">
                {course.sections.length} وحدات • {course.totalLessons} درس
              </span>
            </div>
            <div className="flex flex-col gap-3">
              {course.sections.map((section, i) => (
                <CurriculumSection
                  key={section.id}
                  courseId={course.id}
                  section={section}
                  defaultOpen={i === 0}
                />
              ))}
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-6">
          <Card className="p-6">
            <h2 className="mb-4 text-lg font-bold text-foreground">معلومات الكورس</h2>
            <dl className="flex flex-col gap-3 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">المدرّب</dt>
                <dd className="font-medium text-foreground">{course.instructor}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">المستوى</dt>
                <dd className="font-medium text-foreground">{course.level}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">المدة</dt>
                <dd className="font-medium text-foreground">{course.durationHours} ساعة</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">آخر تحديث</dt>
                <dd className="font-medium text-foreground">{course.lastUpdated}</dd>
              </div>
            </dl>
          </Card>

          {/* Assignments */}
          <Card className="p-6">
            <h2 className="mb-4 text-lg font-bold text-foreground">واجبات الكورس</h2>
            {courseAssignments.length === 0 ? (
              <p className="text-sm text-muted-foreground">لا توجد واجبات حالياً.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {courseAssignments.map((a) => (
                  <li key={a.id}>
                    <Link
                      href={`/student/assignments/${a.id}`}
                      className="flex items-start gap-3 rounded-xl border border-border p-3 transition-colors hover:bg-secondary/50"
                    >
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <FileText className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {a.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          التسليم: {a.dueDate}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

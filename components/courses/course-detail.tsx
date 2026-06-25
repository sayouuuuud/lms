'use client'

import Image from 'next/image'
import Link from 'next/link'
import {
  ChevronRight,
  Upload,
  FilePlus2,
  Users,
  PlayCircle,
  Clock,
  Star,
  MoreVertical,
  FileText,
  Lock,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  getCourseLessons,
  type CourseRecord,
  type LessonRecord,
} from '@/lib/courses-data'

export function CourseDetail({ course }: { course: CourseRecord }) {
  const lessons = getCourseLessons(course)
  const lessonsCount = lessons.filter((l) => l.type === 'درس').length
  const assignmentsCount = lessons.filter((l) => l.type === 'واجب').length

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/courses" className="transition-colors hover:text-foreground">
          الكورسات
        </Link>
        <ChevronRight className="size-4 rotate-180" />
        <span className="font-medium text-foreground">{course.title}</span>
      </nav>

      {/* Course header */}
      <Card className="gap-0 overflow-hidden p-0">
        <div className="flex flex-col gap-5 p-5 md:flex-row">
          <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-xl bg-secondary md:w-72">
            <Image
              src={course.image || '/placeholder.svg'}
              alt={course.title}
              fill
              sizes="(max-width: 768px) 100vw, 18rem"
              className="object-cover"
            />
          </div>

          <div className="flex flex-1 flex-col">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                {course.category}
              </span>
              <span className="rounded-md bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                {course.level}
              </span>
              <span
                className={cn(
                  'rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                  course.status === 'منشور'
                    ? 'bg-success/10 text-success'
                    : 'bg-amber-500/10 text-amber-600',
                )}
              >
                {course.status}
              </span>
            </div>

            <h1 className="mt-2 text-xl font-bold text-foreground text-balance">
              {course.title}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              المدرّب: {course.instructor}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Users className="size-4" />
                {course.students.toLocaleString('ar-EG')} طالب
              </span>
              <span className="flex items-center gap-1.5">
                <PlayCircle className="size-4" />
                {course.lessons} درس
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="size-4" />
                {course.durationHours} ساعة
              </span>
              <span className="flex items-center gap-1.5">
                <Star className="size-4 fill-amber-400 text-amber-400" />
                {course.rating}
              </span>
            </div>

            {/* Upload actions */}
            <div className="mt-auto flex flex-wrap gap-3 pt-5">
              <Button className="gap-2">
                <Upload className="size-4" />
                رفع درس
              </Button>
              <Button variant="outline" className="gap-2 border-border bg-card">
                <FilePlus2 className="size-4" />
                رفع واجب
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Lessons grid */}
      <Card className="gap-0 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground">محتوى الكورس</h2>
          <span className="text-xs text-muted-foreground">
            {lessonsCount} درس · {assignmentsCount} واجب
          </span>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {lessons.map((lesson) => (
            <LessonCard key={lesson.id} lesson={lesson} />
          ))}
        </div>

        {lessons.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground">
            لا يوجد دروس بعد. ابدأ برفع أول درس.
          </div>
        )}
      </Card>
    </div>
  )
}

function LessonCard({ lesson }: { lesson: LessonRecord }) {
  const isAssignment = lesson.type === 'واجب'

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-md">
      <div
        className={cn(
          'relative flex aspect-video w-full items-center justify-center',
          isAssignment ? 'bg-amber-500/10' : 'bg-primary/10',
        )}
      >
        {isAssignment ? (
          <FileText className="size-10 text-amber-600" />
        ) : (
          <PlayCircle className="size-12 text-primary" />
        )}
        <span className="absolute right-3 top-3 flex size-7 items-center justify-center rounded-full bg-card text-xs font-bold text-foreground shadow-sm">
          {lesson.order}
        </span>
        <span
          className={cn(
            'absolute left-3 top-3 rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
            isAssignment
              ? 'bg-amber-500/15 text-amber-600'
              : 'bg-primary/15 text-primary',
          )}
        >
          {lesson.type}
        </span>
        {!lesson.published && (
          <span className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full bg-card/90 px-2 py-0.5 text-[10px] font-medium text-muted-foreground backdrop-blur">
            <Lock className="size-3" />
            مسودة
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-sm font-bold leading-snug text-foreground text-balance">
          {lesson.title}
        </h3>

        <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            {isAssignment ? (
              <FileText className="size-3.5" />
            ) : (
              <Clock className="size-3.5" />
            )}
            {lesson.duration}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground hover:text-foreground"
          >
            <MoreVertical className="size-4" />
            <span className="sr-only">خيارات</span>
          </Button>
        </div>
      </div>
    </article>
  )
}

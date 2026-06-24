'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Lock,
  PlayCircle,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { CourseDetail, Lesson } from '@/lib/student-courses-data'

const iconFor = (lesson: Lesson, active: boolean) => {
  if (lesson.completed) return CheckCircle2
  if (lesson.locked) return Lock
  if (lesson.type === 'مقال') return FileText
  return PlayCircle
}

export function LessonPlayer({
  course,
  lesson,
  index,
  all,
}: {
  course: CourseDetail
  lesson: Lesson
  index: number
  all: Lesson[]
}) {
  const router = useRouter()
  const [completed, setCompleted] = useState(lesson.completed)

  const prev = index > 0 ? all[index - 1] : undefined
  const next = index < all.length - 1 ? all[index + 1] : undefined
  const courseProgress = Math.round(
    (all.filter((l) => l.completed).length / all.length) * 100,
  )

  const goTo = (l?: Lesson) => {
    if (l && !l.locked) {
      router.push(`/student/courses/${course.id}/lessons/${l.id}`)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Link
          href={`/student/courses/${course.id}`}
          className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
        >
          <ArrowRight className="size-4" />
          {course.title}
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Player + content */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card className="overflow-hidden p-0">
            <div className="relative aspect-video w-full bg-black">
              {lesson.type === 'فيديو' ? (
                <video
                  key={lesson.id}
                  controls
                  poster={course.image}
                  className="size-full"
                  preload="metadata"
                >
                  <source src={lesson.videoUrl} type="video/mp4" />
                  متصفحك لا يدعم تشغيل الفيديو.
                </video>
              ) : (
                <div className="flex size-full flex-col items-center justify-center gap-3 text-white/80">
                  <FileText className="size-12" />
                  <p className="text-sm">هذا الدرس عبارة عن محتوى نصي</p>
                </div>
              )}
            </div>
          </Card>

          {/* Lesson info */}
          <Card className="p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <span className="text-xs font-semibold text-primary">
                  الدرس {index + 1} من {all.length}
                </span>
                <h1 className="mt-1 text-xl font-bold text-foreground text-balance">
                  {lesson.title}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {lesson.type} • {lesson.duration}
                </p>
              </div>
              <Button
                variant={completed ? 'outline' : 'default'}
                onClick={() => setCompleted((v) => !v)}
                className={cn(
                  'shrink-0',
                  completed && 'border-primary text-primary',
                )}
              >
                <CheckCircle2 className="size-4" />
                {completed ? 'تم الإكمال' : 'وضع كمكتمل'}
              </Button>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              {lesson.description}
            </p>
          </Card>

          {/* Prev / Next */}
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="outline"
              disabled={!prev || prev.locked}
              onClick={() => goTo(prev)}
              className="gap-1"
            >
              <ChevronRight className="size-4" />
              الدرس السابق
            </Button>
            <Button
              disabled={!next || next.locked}
              onClick={() => goTo(next)}
              className="gap-1"
            >
              الدرس التالي
              <ChevronLeft className="size-4" />
            </Button>
          </div>
        </div>

        {/* Playlist sidebar */}
        <div className="flex flex-col gap-4">
          <Card className="p-5">
            <h2 className="text-base font-bold text-foreground">محتوى الكورس</h2>
            <div className="mt-3">
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">
                  {courseProgress}% مكتمل
                </span>
                <span className="text-muted-foreground">
                  {all.filter((l) => l.completed).length}/{all.length}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${courseProgress}%` }}
                />
              </div>
            </div>
          </Card>

          <Card className="p-0">
            <ul className="max-h-[32rem] divide-y divide-border overflow-y-auto scrollbar-hide">
              {all.map((l, i) => {
                const active = l.id === lesson.id
                const Icon = iconFor(l, active)
                const content = (
                  <div
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 transition-colors',
                      active && 'bg-primary/5',
                      l.locked
                        ? 'cursor-not-allowed opacity-60'
                        : 'hover:bg-secondary/40',
                    )}
                  >
                    <span className="w-5 shrink-0 text-center text-xs text-muted-foreground">
                      {i + 1}
                    </span>
                    <Icon
                      className={cn(
                        'size-5 shrink-0',
                        l.completed
                          ? 'text-primary'
                          : active
                            ? 'text-primary'
                            : l.locked
                              ? 'text-muted-foreground'
                              : 'text-foreground',
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          'truncate text-sm',
                          active
                            ? 'font-semibold text-foreground'
                            : 'font-medium text-foreground',
                        )}
                      >
                        {l.title}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {l.duration}
                      </span>
                    </div>
                  </div>
                )
                return (
                  <li key={l.id}>
                    {l.locked ? (
                      content
                    ) : (
                      <Link
                        href={`/student/courses/${course.id}/lessons/${l.id}`}
                      >
                        {content}
                      </Link>
                    )}
                  </li>
                )
              })}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  )
}

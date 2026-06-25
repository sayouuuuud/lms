'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Search,
  MoreVertical,
  Star,
  Users,
  PlayCircle,
  Clock,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  courseStatusFilters,
  type CourseRecord,
  type CourseStatus,
} from '@/lib/courses-data'

const statusStyles: Record<CourseStatus, string> = {
  منشور: 'bg-success/10 text-success',
  مسودة: 'bg-amber-500/10 text-amber-600',
  مؤرشف: 'bg-secondary text-muted-foreground',
}

export function CoursesGrid({ courses }: { courses: CourseRecord[] }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<CourseStatus | 'الكل'>('الكل')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return courses.filter((course) => {
      const matchesStatus = filter === 'الكل' || course.status === filter
      const matchesQuery =
        q === '' ||
        course.title.toLowerCase().includes(q) ||
        course.instructor.toLowerCase().includes(q) ||
        course.category.toLowerCase().includes(q)
      return matchesStatus && matchesQuery
    })
  }, [courses, query, filter])

  return (
    <Card className="gap-0 p-5">
      {/* Toolbar */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-sm">
          <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث بالاسم أو المدرّب أو التصنيف..."
            className="h-11 w-full rounded-xl border border-border bg-secondary/60 pr-10 pl-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:bg-card"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {courseStatusFilters.map((item) => (
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
      </div>

      {/* Grid */}
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((course) => (
          <Link
            key={course.id}
            href={`/courses/${course.id}`}
            className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-md hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <div className="relative aspect-video w-full overflow-hidden bg-secondary">
              <Image
                src={course.image || '/placeholder.svg'}
                alt={course.title}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <span
                className={cn(
                  'absolute right-3 top-3 rounded-full px-2.5 py-0.5 text-[11px] font-semibold backdrop-blur',
                  statusStyles[course.status],
                )}
              >
                {course.status}
              </span>
            </div>

            <div className="flex flex-1 flex-col p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-md bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {course.category}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {course.level}
                </span>
              </div>

              <h3 className="mt-2 text-base font-bold leading-snug text-foreground text-balance">
                {course.title}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">{course.instructor}</p>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="size-3.5" />
                  {course.students.toLocaleString('ar-EG')} طالب
                </span>
                <span className="flex items-center gap-1">
                  <PlayCircle className="size-3.5" />
                  {course.lessons} درس
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="size-3.5" />
                  {course.durationHours} ساعة
                </span>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                <div className="flex items-center gap-1">
                  <Star className="size-4 fill-amber-400 text-amber-400" />
                  <span className="text-sm font-semibold text-foreground">
                    {course.rating}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-base font-bold text-primary">
                    {course.price}
                  </span>
                  <Button
                    asChild
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-foreground"
                  >
                    <span
                      role="button"
                      tabIndex={-1}
                      onClick={(e) => {
                        e.preventDefault()
                      }}
                    >
                      <MoreVertical className="size-4" />
                      <span className="sr-only">خيارات الكورس</span>
                    </span>
                  </Button>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="py-12 text-center text-sm text-muted-foreground">
          لا يوجد كورسات مطابقة لبحثك
        </div>
      )}

      {/* Footer */}
      <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
        <span>
          عرض <strong className="text-foreground">{filtered.length}</strong> من أصل{' '}
          <strong className="text-foreground">{courses.length}</strong> كورس
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-border bg-card text-foreground"
          >
            السابق
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-border bg-card text-foreground"
          >
            التالي
          </Button>
        </div>
      </div>
    </Card>
  )
}

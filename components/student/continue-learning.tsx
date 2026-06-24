import Image from 'next/image'
import { Play, BookOpen } from 'lucide-react'
import { PanelCard } from '@/components/dashboard/panel-card'
import { Button } from '@/components/ui/button'
import { enrolledCourses } from '@/lib/student-data'

export function ContinueLearning() {
  const courses = enrolledCourses.slice(0, 3)

  return (
    <PanelCard title="أكمل من حيث توقفت" action="عرض الكل">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {courses.map((course, idx) => {
          const percent = Math.round(
            (course.completedLessons / course.totalLessons) * 100,
          )
          return (
            <div
              key={course.id}
              className="flex flex-col overflow-hidden rounded-xl border border-border bg-secondary/30 transition-colors hover:bg-secondary/60"
            >
              {/* Thumbnail */}
              <div className="relative aspect-video w-full overflow-hidden">
                <Image
                  src={course.image || '/placeholder.svg'}
                  alt={course.title}
                  fill
                  sizes="(max-width: 640px) 100vw, 33vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <div className="flex size-9 items-center justify-center rounded-full bg-white/90 text-sidebar shadow">
                    <Play className="size-4 fill-current" />
                  </div>
                </div>
                {idx === 0 && (
                  <span className="absolute right-2 top-2 rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                    متابعة
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="flex flex-1 flex-col gap-2 p-3">
                <span className="text-[10px] font-medium text-primary">
                  {course.category}
                </span>
                <h4 className="line-clamp-2 text-xs font-bold leading-snug text-foreground">
                  {course.title}
                </h4>
                <p className="line-clamp-1 text-[10px] text-muted-foreground">
                  <BookOpen className="me-1 inline size-3" />
                  {course.nextLesson}
                </p>

                {/* Progress */}
                <div className="mt-auto">
                  <div className="mb-1 flex items-center justify-between text-[10px]">
                    <span className="font-medium text-foreground">{percent}%</span>
                    <span className="text-muted-foreground">
                      {course.completedLessons}/{course.totalLessons} درس
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>

                <Button size="sm" className="mt-2 h-7 w-full text-xs">
                  <Play className="size-3" />
                  {idx === 0 ? 'متابعة الدرس' : 'أكمل الدرس'}
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </PanelCard>
  )
}

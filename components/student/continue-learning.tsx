import Image from 'next/image'
import { Play } from 'lucide-react'
import { PanelCard } from '@/components/dashboard/panel-card'
import { Button } from '@/components/ui/button'
import { enrolledCourses } from '@/lib/student-data'

export function ContinueLearning() {
  const course = enrolledCourses[0]
  const percent = Math.round(
    (course.completedLessons / course.totalLessons) * 100,
  )

  return (
    <PanelCard title="أكمل من حيث توقفت">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-xl sm:w-48">
          <Image
            src={course.image || '/placeholder.svg'}
            alt={course.title}
            fill
            sizes="(max-width: 640px) 100vw, 192px"
            className="object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <div className="flex size-12 items-center justify-center rounded-full bg-white/90 text-sidebar">
              <Play className="size-5 fill-current" />
            </div>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <span className="text-xs font-medium text-primary">{course.category}</span>
          <h4 className="mt-1 text-base font-bold text-foreground">{course.title}</h4>
          <p className="mt-1 text-sm text-muted-foreground">
            الدرس التالي: {course.nextLesson}
          </p>

          <div className="mt-3">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">{percent}% مكتمل</span>
              <span className="text-muted-foreground">
                {course.completedLessons} / {course.totalLessons} درس
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>

          <Button className="mt-4 w-fit">
            <Play className="size-4" />
            متابعة الدرس
          </Button>
        </div>
      </div>
    </PanelCard>
  )
}

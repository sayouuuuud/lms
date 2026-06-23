import Image from 'next/image'
import { PanelCard } from '@/components/dashboard/panel-card'
import { enrolledCourses } from '@/lib/student-data'

export function MyCourses() {
  return (
    <PanelCard title="كورساتي" action="عرض الكل">
      <ul className="space-y-0.5">
        {enrolledCourses.map((course) => {
          const percent = Math.round(
            (course.completedLessons / course.totalLessons) * 100,
          )
          return (
            <li
              key={course.id}
              className="flex items-center gap-3 rounded-xl px-2 py-1.5 transition-colors hover:bg-secondary/60"
            >
              <div className="relative size-14 shrink-0 overflow-hidden rounded-lg">
                <Image
                  src={course.image || '/placeholder.svg'}
                  alt={course.title}
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">
                  {course.title}
                </p>
                <p className="text-xs text-muted-foreground">{course.instructor}</p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className="shrink-0 text-xs font-medium text-muted-foreground">
                    {percent}%
                  </span>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </PanelCard>
  )
}

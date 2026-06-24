import Image from 'next/image'
import { Play, ChevronLeft } from 'lucide-react'
import { PanelCard } from '@/components/dashboard/panel-card'
import { enrolledCourses } from '@/lib/student-data'

export function ContinueLearning() {
  const main = enrolledCourses[0]
  const rest = enrolledCourses.slice(1)
  const mainPct = Math.round((main.completedLessons / main.totalLessons) * 100)

  return (
    <PanelCard title="أكمل من حيث توقفت" action="عرض الكل">
      {/* الكارد الرئيسية */}
      <div className="relative mb-3 overflow-hidden rounded-xl">
        <Image
          src={main.image}
          alt={main.title}
          width={800}
          height={200}
          className="h-[170px] w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <button className="absolute left-1/2 top-1/2 flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-black shadow-lg transition hover:scale-105 hover:bg-white">
          <Play className="size-5 fill-current" />
        </button>
        <div className="absolute bottom-0 w-full px-3 pb-3">
          <span className="text-[11px] text-white/60">{main.instructor}</span>
          <p className="truncate text-sm font-bold text-white">{main.title}</p>
          <p className="mt-0.5 truncate text-xs text-white/70">التالي: {main.nextLesson}</p>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/25">
            <div className="h-full rounded-full bg-white" style={{ width: `${mainPct}%` }} />
          </div>
          <p className="mt-1 text-[11px] text-white/60">{mainPct}% مكتمل · {main.completedLessons}/{main.totalLessons} درس</p>
        </div>
      </div>

      {/* باقي الكورسات */}
      <ul className="space-y-0.5">
        {rest.map((course) => {
          const pct = Math.round((course.completedLessons / course.totalLessons) * 100)
          return (
            <li key={course.id} className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-1.5 transition-colors hover:bg-secondary/60">
              <Image
                src={course.image}
                alt={course.title}
                width={40}
                height={40}
                className="size-10 shrink-0 rounded-lg object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-foreground">{course.title}</p>
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{pct}%</span>
                </div>
              </div>
              <ChevronLeft className="size-4 shrink-0 text-muted-foreground" />
            </li>
          )
        })}
      </ul>
    </PanelCard>
  )
}

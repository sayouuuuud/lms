import { BookOpen, CheckCircle2, FileCheck2, Clock } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { CourseProgress, GradeItem, ActivityDay } from '@/lib/student-types'

export function StudentStats({
  courses = [],
  grades = [],
  activity = [],
}: {
  courses?: CourseProgress[]
  grades?: GradeItem[]
  activity?: ActivityDay[]
}) {
  const totalCompletedLessons = courses.reduce((s, c) => s + c.completedLessons, 0)
  const totalLessons = courses.reduce((s, c) => s + c.totalLessons, 0)

  // Total learning hours this week (last 7 days from activity).
  const weekHours = parseFloat(
    activity.reduce((s, d) => s + d.hours, 0).toFixed(1),
  )

  const stats = [
    {
      label: 'المحاضرات المشترك بها',
      value: String(courses.length),
      sub: courses.length === 1 ? 'محاضرة واحدة' : 'محاضرات حالية',
      icon: BookOpen,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: 'الدروس المكتملة',
      value: String(totalCompletedLessons),
      sub: totalLessons > 0 ? `من ${totalLessons} درس` : 'لم تبدأ بعد',
      icon: CheckCircle2,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
    },
    {
      label: 'الواجبات المحلولة',
      value: String(grades.length),
      sub: grades.length === 1 ? 'واجب واحد' : 'واجبات مكتملة',
      icon: FileCheck2,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
    },
    {
      label: 'ساعات المشاهدة',
      value: String(weekHours),
      sub: 'خلال الأسبوع الحالي',
      icon: Clock,
      color: 'text-secondary-foreground',
      bg: 'bg-secondary',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="gap-0 p-4 transition-shadow hover:shadow-md">
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
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-foreground">{stat.value}</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{stat.sub}</p>
        </Card>
      ))}
    </div>
  )
}

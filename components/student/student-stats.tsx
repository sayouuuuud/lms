import { BookOpen, CheckCircle2, Award, Clock } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const stats = [
  {
    label: 'الكورسات المسجّلة',
    value: '4',
    sub: 'كورسات نشطة',
    icon: BookOpen,
    color: 'text-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-500/10',
  },
  {
    label: 'الدروس المكتملة',
    value: '44',
    sub: 'من 90 درس',
    icon: CheckCircle2,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
  },
  {
    label: 'الشهادات',
    value: '2',
    sub: 'شهادة مكتسبة',
    icon: Award,
    color: 'text-amber-600',
    bg: 'bg-amber-50 dark:bg-amber-500/10',
  },
  {
    label: 'ساعات التعلّم',
    value: '47',
    sub: 'هذا الشهر',
    icon: Clock,
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
]

export function StudentStats() {
  return (
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
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-foreground">{stat.value}</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{stat.sub}</p>
        </Card>
      ))}
    </div>
  )
}

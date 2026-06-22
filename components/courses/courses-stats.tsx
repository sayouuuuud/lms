import { BookOpen, CheckCircle2, FileEdit, Star, TrendingUp } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const stats = [
  {
    label: 'إجمالي الكورسات',
    value: '86',
    change: '+6.2%',
    sub: 'من الشهر الماضي',
    icon: BookOpen,
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
  {
    label: 'كورسات منشورة',
    value: '72',
    change: '+4.8%',
    sub: 'من الشهر الماضي',
    icon: CheckCircle2,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
  },
  {
    label: 'مسودات قيد الإعداد',
    value: '14',
    change: '+2.1%',
    sub: 'من الشهر الماضي',
    icon: FileEdit,
    color: 'text-amber-600',
    bg: 'bg-amber-50 dark:bg-amber-500/10',
  },
  {
    label: 'متوسط التقييم',
    value: '4.7',
    change: '+0.3',
    sub: 'من الشهر الماضي',
    icon: Star,
    color: 'text-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-500/10',
  },
]

export function CoursesStats() {
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
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            <span
              className={cn(
                'flex items-center gap-0.5 font-semibold',
                stat.change.startsWith('-') ? 'text-rose-600' : 'text-emerald-600',
              )}
            >
              <TrendingUp
                className={cn('size-3.5', stat.change.startsWith('-') && 'rotate-180')}
              />
              {stat.change}
            </span>
            <span className="text-muted-foreground">{stat.sub}</span>
          </div>
        </Card>
      ))}
    </div>
  )
}

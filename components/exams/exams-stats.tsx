import { FileText, CheckCircle2, Users, Target, TrendingUp } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const stats = [
  {
    label: 'إجمالي الاختبارات',
    value: '128',
    change: '+12.4%',
    sub: 'من الشهر الماضي',
    icon: FileText,
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
  {
    label: 'الاختبارات المنشورة',
    value: '94',
    change: '+9.7%',
    sub: 'من الشهر الماضي',
    icon: CheckCircle2,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
  },
  {
    label: 'إجمالي المشاركات',
    value: '6,420',
    change: '+18.2%',
    sub: 'من الشهر الماضي',
    icon: Users,
    color: 'text-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-500/10',
  },
  {
    label: 'متوسط النجاح',
    value: '73%',
    change: '-2.1%',
    sub: 'من الشهر الماضي',
    icon: Target,
    color: 'text-amber-600',
    bg: 'bg-amber-50 dark:bg-amber-500/10',
  },
]

export function ExamsStats() {
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

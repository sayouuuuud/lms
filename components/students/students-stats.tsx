import { Users, UserCheck, UserPlus, UserX, TrendingUp } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const stats = [
  {
    label: 'إجمالي الطلاب',
    value: '12,560',
    change: '+24.5%',
    sub: 'من الشهر الماضي',
    icon: Users,
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
  {
    label: 'الطلاب النشطون',
    value: '9,840',
    change: '+12.3%',
    sub: 'من الشهر الماضي',
    icon: UserCheck,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
  },
  {
    label: 'طلاب جدد هذا الشهر',
    value: '1,245',
    change: '+8.1%',
    sub: 'من الشهر الماضي',
    icon: UserPlus,
    color: 'text-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-500/10',
  },
  {
    label: 'حسابات موقوفة',
    value: '128',
    change: '-3.4%',
    sub: 'من الشهر الماضي',
    icon: UserX,
    color: 'text-rose-600',
    bg: 'bg-rose-50 dark:bg-rose-500/10',
  },
]

export function StudentsStats() {
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

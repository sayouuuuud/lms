import { Wallet, Video, BookOpen, Users, ShoppingCart, TrendingUp } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const stats = [
  {
    label: 'إجمالي الإيرادات',
    value: '125,430',
    unit: 'ج.م',
    change: '+18.6%',
    sub: 'من الشهر الماضي',
    icon: Wallet,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
  },
  {
    label: 'عدد الدروس',
    value: '1,250',
    change: '+12',
    sub: 'من الأسبوع الماضي',
    icon: Video,
    color: 'text-rose-600',
    bg: 'bg-rose-50 dark:bg-rose-500/10',
  },
  {
    label: 'عدد الكورسات',
    value: '84',
    change: '+6',
    sub: 'من الشهر الماضي',
    icon: BookOpen,
    color: 'text-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-500/10',
  },
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
    label: 'المبيعات اليوم',
    value: '7,540',
    unit: 'ج.م',
    change: '+14.3%',
    sub: 'من أمس',
    icon: ShoppingCart,
    color: 'text-amber-600',
    bg: 'bg-amber-50 dark:bg-amber-500/10',
  },
]

export function StatCards() {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
      {stats.map((stat) => (
        <Card
          key={stat.label}
          className="gap-0 p-5 transition-shadow hover:shadow-md"
        >
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
            {stat.unit && (
              <span className="text-sm font-medium text-muted-foreground">
                {stat.unit}
              </span>
            )}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            <span className="flex items-center gap-0.5 font-semibold text-emerald-600">
              <TrendingUp className="size-3.5" />
              {stat.change}
            </span>
            <span className="text-muted-foreground">{stat.sub}</span>
          </div>
        </Card>
      ))}
    </div>
  )
}

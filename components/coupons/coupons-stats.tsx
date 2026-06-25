import { Ticket, CheckCircle2, TrendingUp, Percent } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { couponRecords } from '@/lib/coupons-data'

export function CouponsStats() {
  const totalCoupons = couponRecords.length
  const activeCoupons = couponRecords.filter((c) => c.status === 'نشط').length
  const totalRedemptions = couponRecords.reduce((sum, c) => sum + c.used, 0)
  const avgDiscount = Math.round(
    couponRecords
      .filter((c) => c.type === 'نسبة مئوية')
      .reduce((sum, c, _, arr) => sum + c.value / arr.length, 0),
  )

  const stats = [
    {
      label: 'إجمالي الكوبونات',
      value: totalCoupons.toLocaleString('en-US'),
      icon: Ticket,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: 'كوبونات نشطة',
      value: activeCoupons.toLocaleString('en-US'),
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    },
    {
      label: 'مرات الاستخدام',
      value: totalRedemptions.toLocaleString('en-US'),
      icon: TrendingUp,
      color: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-500/10',
    },
    {
      label: 'متوسط نسبة الخصم',
      value: `${avgDiscount}%`,
      icon: Percent,
      color: 'text-amber-600',
      bg: 'bg-amber-50 dark:bg-amber-500/10',
    },
  ]

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
        </Card>
      ))}
    </div>
  )
}

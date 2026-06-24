'use client'

import { PanelCard } from '@/components/dashboard/panel-card'
import { TrendingUp } from 'lucide-react'

const stats = [
  { label: 'درس مكتمل', value: 44, change: '+8 هذا الشهر', positive: true },
  { label: 'ساعة تعلّم', value: 47, change: '+12 هذا الشهر', positive: true },
  { label: 'يوم نشاط متتالي', value: 7, change: 'أفضل رقم: 12 يوم', positive: null },
  { label: 'متوسط الدرجات', value: '92%', change: '+4% عن الشهر الماضي', positive: true },
]

export function MonthlyProgress() {
  return (
    <PanelCard title="إنجازات هذا الشهر" icon={TrendingUp}>
      <div className="grid grid-cols-2 gap-2">
        {stats.map((s) => (
          <div
            key={s.label}
            className="flex flex-col gap-0.5 rounded-xl bg-secondary/50 px-3 py-2.5"
          >
            <span className="text-xl font-bold text-foreground">{s.value}</span>
            <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
            <span
              className={
                s.positive === true
                  ? 'text-xs font-semibold text-green-500'
                  : s.positive === false
                    ? 'text-xs font-semibold text-red-500'
                    : 'text-xs text-muted-foreground'
              }
            >
              {s.change}
            </span>
          </div>
        ))}
      </div>
    </PanelCard>
  )
}

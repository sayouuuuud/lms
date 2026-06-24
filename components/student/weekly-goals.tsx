'use client'

import { PanelCard } from '@/components/dashboard/panel-card'
import { cn } from '@/lib/utils'

const goals = [
  { label: 'دروس مشاهَدة', current: 5, target: 7, color: 'bg-primary' },
  { label: 'ساعات تعلّم', current: 10, target: 14, color: 'bg-blue-500' },
  { label: 'واجبات مسلَّمة', current: 2, target: 3, color: 'bg-amber-500' },
  { label: 'اختبارات مؤدّاة', current: 1, target: 2, color: 'bg-green-500' },
]

export function WeeklyGoals() {
  return (
    <PanelCard title="أهدافك الأسبوعية">
      <ul className="space-y-3">
        {goals.map((goal) => {
          const pct = Math.min(Math.round((goal.current / goal.target) * 100), 100)
          return (
            <li key={goal.label}>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-sm text-foreground">{goal.label}</span>
                <span className="text-xs font-semibold text-muted-foreground">
                  {goal.current}/{goal.target}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className={cn('h-full rounded-full transition-all duration-500', goal.color)}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          )
        })}
      </ul>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        يتجدد الجدول كل الأحد
      </p>
    </PanelCard>
  )
}

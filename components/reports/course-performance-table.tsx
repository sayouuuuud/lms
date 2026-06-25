import { Star } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { coursePerformance } from '@/lib/reports-data'

function CompletionBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full bg-primary" style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs font-medium text-muted-foreground">{value}%</span>
    </div>
  )
}

export function CoursePerformanceTable() {
  return (
    <Card className="gap-0 overflow-hidden p-0">
      <div className="flex items-center justify-between border-b border-border p-5">
        <h3 className="text-base font-bold text-foreground">أداء الكورسات</h3>
        <button type="button" className="text-xs font-semibold text-primary hover:underline">
          عرض الكل
        </button>
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-right text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="px-5 py-3 font-medium">الكورس</th>
              <th className="px-5 py-3 font-medium">التصنيف</th>
              <th className="px-5 py-3 font-medium">الطلاب</th>
              <th className="px-5 py-3 font-medium">الإيرادات</th>
              <th className="px-5 py-3 font-medium">نسبة الإكمال</th>
              <th className="px-5 py-3 font-medium">التقييم</th>
            </tr>
          </thead>
          <tbody>
            {coursePerformance.map((c) => (
              <tr key={c.title} className="border-b border-border last:border-0 hover:bg-secondary/40">
                <td className="px-5 py-4 font-semibold text-foreground">{c.title}</td>
                <td className="px-5 py-4 text-muted-foreground">{c.category}</td>
                <td className="px-5 py-4 text-foreground">{c.students.toLocaleString('en-US')}</td>
                <td className="px-5 py-4 font-semibold text-foreground">
                  {c.revenue.toLocaleString('en-US')} ج.م
                </td>
                <td className="px-5 py-4">
                  <CompletionBar value={c.completion} />
                </td>
                <td className="px-5 py-4">
                  <span className="flex items-center gap-1 font-semibold text-foreground">
                    <Star className="size-4 fill-amber-400 text-amber-400" />
                    {c.rating}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="divide-y divide-border md:hidden">
        {coursePerformance.map((c) => (
          <div key={c.title} className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-foreground">{c.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{c.category}</p>
              </div>
              <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-foreground">
                <Star className="size-4 fill-amber-400 text-amber-400" />
                {c.rating}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{c.students.toLocaleString('en-US')} طالب</span>
              <span className="font-semibold text-foreground">
                {c.revenue.toLocaleString('en-US')} ج.م
              </span>
            </div>
            <CompletionBar value={c.completion} />
          </div>
        ))}
      </div>
    </Card>
  )
}

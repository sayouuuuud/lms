import { Download, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ReportsPageHeader() {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="text-right">
        <h2 className="text-2xl font-bold text-foreground">التقارير</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          نظرة تحليلية شاملة على أداء المنصة والإيرادات والطلاب
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline">
          <Calendar className="size-4" />
          آخر 6 أشهر
        </Button>
        <Button>
          <Download className="size-4" />
          تصدير التقرير
        </Button>
      </div>
    </div>
  )
}

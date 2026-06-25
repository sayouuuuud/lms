import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function PaymentsPageHeader() {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="text-right">
        <h2 className="text-2xl font-bold text-foreground">المدفوعات</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          مراجعة طلبات الدفع المرسلة من الطلاب وقبول أو رفض التحويلات
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          className="border-border bg-card text-foreground hover:bg-secondary"
        >
          <Download className="size-4" />
          تصدير البيانات
        </Button>
      </div>
    </div>
  )
}

import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function CouponsPageHeader() {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="text-right">
        <h2 className="text-2xl font-bold text-foreground">الخصومات والكوبونات</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          إنشاء وإدارة أكواد الخصم وتتبّع استخدامها من قِبل الطلاب
        </p>
      </div>

      <Button>
        <Plus className="size-4" />
        إنشاء كوبون
      </Button>
    </div>
  )
}

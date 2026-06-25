'use client'

import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCoupons } from './coupons-context'

export function CouponsPageHeader() {
  const { openCreate } = useCoupons()

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="text-right">
        <h2 className="text-2xl font-bold text-foreground">الخصومات والكوبونات</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          إنشاء وإدارة أكواد الخصم وتتبّع استخدامها من قِبل الطلاب
        </p>
      </div>

      <Button onClick={openCreate}>
        <Plus className="size-4" />
        إنشاء كوبون
      </Button>
    </div>
  )
}

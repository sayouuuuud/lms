'use client'

import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCategories } from './categories-context'

export function CategoriesPageHeader() {
  const { openCreate } = useCategories()

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="text-right">
        <h2 className="text-2xl font-bold text-foreground">التصنيفات</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          تنظيم الكورسات داخل تصنيفات لتسهيل تصفّحها على الطلاب
        </p>
      </div>

      <Button onClick={openCreate}>
        <Plus className="size-4" />
        إضافة تصنيف
      </Button>
    </div>
  )
}

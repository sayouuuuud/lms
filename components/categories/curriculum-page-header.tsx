'use client'

import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCurriculum } from './curriculum-context'

export function CurriculumPageHeader() {
  const { openCreateStage } = useCurriculum()

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="text-right">
        <h2 className="text-2xl font-bold text-foreground">المراحل والفروع</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          نظّم المراحل الدراسية وفروعها — وهي نفس البيانات اللي بتظهر للطلاب في الصفحة الرئيسية
        </p>
      </div>

      <Button onClick={openCreateStage}>
        <Plus className="size-4" />
        إضافة مرحلة
      </Button>
    </div>
  )
}

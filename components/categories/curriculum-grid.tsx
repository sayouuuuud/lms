'use client'

import { useState } from 'react'
import {
  ChevronDown,
  Pencil,
  Trash2,
  Plus,
  GitBranch,
  BookOpen,
  Coins,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useCurriculum } from './curriculum-context'

const accentStyles: Record<string, string> = {
  gold: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400',
  emerald:
    'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400',
}

export function CurriculumGrid() {
  const {
    stages,
    openEditStage,
    requestDeleteStage,
    openCreateBranch,
    openEditBranch,
    requestDeleteBranch,
  } = useCurriculum()

  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  if (stages.length === 0) {
    return (
      <Card className="p-16 text-center text-sm text-muted-foreground">
        لا توجد مراحل بعد. اضغط «إضافة مرحلة» للبدء.
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {stages.map((stage) => {
        const isOpen = expanded[stage.id] ?? true
        const lectureTotal = stage.branches.reduce(
          (sum, b) => sum + b.lectureCount,
          0,
        )
        return (
          <Card key={stage.id} className="gap-0 overflow-hidden p-0">
            {/* Stage header */}
            <div className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setExpanded((prev) => ({ ...prev, [stage.id]: !isOpen }))
                  }
                  className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-secondary"
                  aria-label={isOpen ? 'طي الفروع' : 'عرض الفروع'}
                >
                  <ChevronDown
                    className={cn(
                      'size-4 transition-transform',
                      isOpen ? '' : '-rotate-90',
                    )}
                  />
                </button>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground">
                      {stage.idx}
                    </span>
                    <h3 className="text-base font-bold text-foreground">
                      {stage.title}
                    </h3>
                    <Badge
                      variant="outline"
                      className={cn('font-medium', accentStyles[stage.accent])}
                    >
                      {stage.accent === 'gold' ? 'ذهبي' : 'زمردي'}
                    </Badge>
                  </div>
                  <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
                    {stage.subtitle}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <GitBranch className="size-3.5" />
                      <span className="font-medium text-foreground">
                        {stage.branches.length}
                      </span>
                      فرع
                    </span>
                    <span className="flex items-center gap-1.5">
                      <BookOpen className="size-3.5" />
                      <span className="font-medium text-foreground">
                        {lectureTotal}
                      </span>
                      محاضرة
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Coins className="size-3.5" />
                      سعر الترم
                      <span className="font-medium text-foreground">
                        {stage.termPrice.toLocaleString('en-US')} ج
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={() => openEditStage(stage)}
                >
                  <Pencil className="size-4" />
                  تعديل
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-500/30 dark:hover:bg-rose-500/10"
                  onClick={() => requestDeleteStage(stage)}
                >
                  <Trash2 className="size-4" />
                  <span className="sr-only">حذف المرحلة</span>
                </Button>
              </div>
            </div>

            {/* Branches */}
            {isOpen && (
              <div className="space-y-3 bg-secondary/30 p-5">
                {stage.branches.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    لا توجد فروع في هذه المرحلة بعد.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {stage.branches.map((branch) => (
                      <div
                        key={branch.id}
                        className="group flex flex-col rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-sm font-bold text-foreground">
                            {branch.title}
                          </h4>
                          <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                            <BookOpen className="size-3.5" />
                            {branch.lectureCount} محاضرة
                          </span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                          {branch.description}
                        </p>
                        <div className="mt-3 flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 flex-1 text-xs"
                            onClick={() => openEditBranch(stage.id, branch)}
                          >
                            <Pencil className="size-3.5" />
                            تعديل
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-500/30 dark:hover:bg-rose-500/10"
                            onClick={() => requestDeleteBranch(branch)}
                          >
                            <Trash2 className="size-3.5" />
                            <span className="sr-only">حذف الفرع</span>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-dashed"
                  onClick={() => openCreateBranch(stage.id)}
                >
                  <Plus className="size-4" />
                  إضافة فرع لهذه المرحلة
                </Button>
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}

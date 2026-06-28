'use client'

import { ArrowRight, Download, Settings, Trash2, Pencil } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export function ExamDetailsHeader({
  exam,
}: {
  exam: {
    code: string
    title: string
    status: string
  }
}) {
  const router = useRouter()

  const isPublished = exam.status === 'منشور'

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.push('/admin/exams')}
          className="size-9 shrink-0"
        >
          <ArrowRight className="size-4" />
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">{exam.title}</h1>
            <Badge
              variant="outline"
              className={cn(
                'font-medium text-xs',
                isPublished
                  ? 'border-success/30 bg-success/10 text-success'
                  : 'border-muted-foreground/30 bg-secondary text-muted-foreground'
              )}
            >
              {exam.status}
            </Badge>
          </div>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            كود الامتحان: <strong className="text-foreground font-mono">{exam.code}</strong>
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Button variant="outline" size="sm" className="hidden sm:flex">
          <Download className="mr-2 size-4" />
          تصدير تقرير
        </Button>
        <Button variant="outline" size="sm">
          <Pencil className="mr-2 size-4" />
          تعديل
        </Button>
        <Button variant="outline" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  )
}

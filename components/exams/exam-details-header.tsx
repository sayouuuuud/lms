'use client'

import { ArrowRight, Download, Trash2, Pencil, Calendar, Clock, BookOpen } from 'lucide-react'
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
    course?: string
    duration?: number
    createdAt?: string
  }
}) {
  const router = useRouter()
  const isPublished = exam.status === 'منشور'

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-6">
      <div className="flex items-start gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/admin/exams')}
          className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground"
        >
          <ArrowRight className="size-5" />
        </Button>
        
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{exam.title}</h1>
            <Badge
              variant={isPublished ? 'default' : 'secondary'}
              className={cn(
                'font-normal text-xs rounded-md',
                isPublished ? 'bg-success/15 text-success hover:bg-success/20 shadow-none' : ''
              )}
            >
              {exam.status}
            </Badge>
          </div>
          
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5 font-mono">
              <span>{exam.code}</span>
            </div>
            
            {exam.course && (
              <div className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-muted-foreground/30 mx-1" />
                <BookOpen className="size-3.5" />
                <span>{exam.course}</span>
              </div>
            )}
            
            {exam.duration && (
              <div className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-muted-foreground/30 mx-1" />
                <Clock className="size-3.5" />
                <span>{exam.duration} دقيقة</span>
              </div>
            )}
            
            {exam.createdAt && (
              <div className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-muted-foreground/30 mx-1" />
                <Calendar className="size-3.5" />
                <span>{exam.createdAt}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Button variant="outline" size="sm" className="hidden sm:flex">
          <Download className="mr-2 size-4" />
          تصدير التقرير
        </Button>
        <Button variant="default" size="sm">
          <Pencil className="mr-2 size-4" />
          تعديل
        </Button>
        <Button variant="destructive" size="icon" className="h-8 w-8">
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  )
}

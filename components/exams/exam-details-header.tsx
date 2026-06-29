'use client'

import { ArrowRight, Download, Settings, Trash2, Pencil, Calendar, Clock, BookOpen } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

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
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border bg-card p-6 shadow-sm sm:p-8"
    >
      <div className="absolute top-0 right-0 h-full w-full bg-gradient-to-l from-primary/5 to-transparent opacity-70 pointer-events-none" />
      
      <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push('/admin/exams')}
            className="mt-1 size-10 shrink-0 rounded-full transition-transform hover:scale-105 hover:bg-primary hover:text-primary-foreground"
          >
            <ArrowRight className="size-5" />
          </Button>
          
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{exam.title}</h1>
              <Badge
                className={cn(
                  'px-3 py-1 font-medium text-xs rounded-full border-none shadow-sm',
                  isPublished
                    ? 'bg-success/15 text-success hover:bg-success/20'
                    : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                )}
              >
                {exam.status}
              </Badge>
            </div>
            
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <span className="font-mono bg-secondary/80 px-2.5 py-0.5 rounded-md text-foreground shadow-sm border border-border/50">{exam.code}</span>
              </div>
              
              {exam.course && (
                <div className="flex items-center gap-1.5 bg-secondary/40 px-2 py-0.5 rounded-md">
                  <BookOpen className="size-4 text-primary/70" />
                  <span>{exam.course}</span>
                </div>
              )}
              
              {exam.duration && (
                <div className="flex items-center gap-1.5 bg-secondary/40 px-2 py-0.5 rounded-md">
                  <Clock className="size-4 text-primary/70" />
                  <span>{exam.duration} دقيقة</span>
                </div>
              )}
              
              {exam.createdAt && (
                <div className="flex items-center gap-1.5 bg-secondary/40 px-2 py-0.5 rounded-md">
                  <Calendar className="size-4 text-primary/70" />
                  <span>{exam.createdAt}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" className="hidden sm:flex rounded-xl bg-card hover:bg-secondary/80 hover:text-foreground transition-all">
            <Download className="mr-2 size-4" />
            تصدير تقرير
          </Button>
          <Button variant="default" className="rounded-xl shadow-md hover:shadow-lg transition-all">
            <Pencil className="mr-2 size-4" />
            تعديل
          </Button>
          <Button variant="outline" size="icon" className="rounded-xl text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all shadow-sm">
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  )
}

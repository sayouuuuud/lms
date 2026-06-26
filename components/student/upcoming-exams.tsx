'use client'

import { PanelCard } from '@/components/dashboard/panel-card'
import { Clock, AlertCircle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const exams = [
  {
    id: 'e1',
    title: 'اختبار الوحدة الثالثة',
    course: 'علوم البيانات وPython',
    date: 'غداً',
    time: '05:00 م',
    duration: '60 دقيقة',
    status: 'قريب',
    questions: 20,
  },
  {
    id: 'e2',
    title: 'اختبار منتصف الفصل',
    course: 'تطوير واجهات React',
    date: 'الأحد',
    time: '07:00 م',
    duration: '90 دقيقة',
    status: 'قادم',
    questions: 35,
  },
  {
    id: 'e3',
    title: 'اختبار نهائي التصميم',
    course: 'أساسيات UI/UX',
    date: '5 يوليو',
    time: '03:00 م',
    duration: '120 دقيقة',
    status: 'قادم',
    questions: 50,
  },
]

const statusConfig = {
  قريب: { color: 'text-red-500', bg: 'bg-red-500/10', icon: AlertCircle },
  قادم: { color: 'text-primary', bg: 'bg-primary/10', icon: Clock },
  مكتمل: { color: 'text-green-500', bg: 'bg-green-500/10', icon: CheckCircle2 },
}

export function UpcomingExams() {
  return (
    <PanelCard title="الاختبارات القادمة" action="عرض الكل">
      <ul className="space-y-0.5">
        {exams.map((exam) => {
          const cfg = statusConfig[exam.status as keyof typeof statusConfig] ?? statusConfig['قادم']
          const Icon = cfg.icon
          return (
            <li
              key={exam.id}
              className="flex items-start gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-secondary/60"
            >
              <div className={cn('mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg', cfg.bg)}>
                <Icon className={cn('size-4', cfg.color)} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{exam.title}</p>
                <p className="truncate text-xs text-muted-foreground">{exam.course}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className={cn('text-xs font-semibold', cfg.color)}>{exam.date} · {exam.time}</span>
                  <span className="text-xs text-muted-foreground">{exam.duration} · {exam.questions} سؤال</span>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </PanelCard>
  )
}

'use client'

import { Card } from '@/components/ui/card'
import { Users, Clock, Target, ListChecks, Activity, HelpCircle } from 'lucide-react'
import type { ExamDetailsData } from '@/app/admin/exams/[id]/actions'
import { cn } from '@/lib/utils'

export function ExamStats({ data }: { data: ExamDetailsData }) {
  // Compute some extra stats from submissions if we want
  const passedCount = data.submissions.filter((s) => (s.score / s.total) * 100 >= 50).length
  const passRate = data.participants > 0 ? Math.round((passedCount / data.participants) * 100) : 0

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card className="flex items-center gap-4 p-5">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Target className="size-6" />
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">متوسط الدرجات</p>
          <p className="text-2xl font-bold text-foreground">
            {data.avgScore > 0 ? `${data.avgScore}%` : '-'}
          </p>
        </div>
      </Card>

      <Card className="flex items-center gap-4 p-5">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
          <Activity className="size-6" />
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">نسبة النجاح</p>
          <p className="text-2xl font-bold text-foreground">
            {data.participants > 0 ? `${passRate}%` : '-'}
          </p>
        </div>
      </Card>

      <Card className="flex items-center gap-4 p-5">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600">
          <Users className="size-6" />
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">عدد المشاركين</p>
          <p className="text-2xl font-bold text-foreground">
            {data.participants.toLocaleString('ar-EG')}
          </p>
        </div>
      </Card>

      <Card className="flex items-center gap-4 p-5">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600">
          <HelpCircle className="size-6" />
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">عدد الأسئلة</p>
          <p className="text-2xl font-bold text-foreground">
            {data.questionsCount}
          </p>
        </div>
      </Card>
    </div>
  )
}

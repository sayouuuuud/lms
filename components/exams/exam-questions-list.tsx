'use client'

import { Card } from '@/components/ui/card'
import { CheckCircle2 } from 'lucide-react'
import type { ExamQuestion } from '@/app/admin/exams/[id]/actions'
import { cn } from '@/lib/utils'

export function ExamQuestionsList({ questions }: { questions: ExamQuestion[] }) {
  if (questions.length === 0) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        لا توجد أسئلة مضافة لهذا الاختبار حتى الآن.
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {questions.map((question, index) => (
        <Card key={question.id} className="p-5">
          <div className="mb-4 flex items-start justify-between gap-4">
            <h3 className="font-semibold text-foreground">
              <span className="text-muted-foreground ml-2">{index + 1}.</span>
              {question.text}
            </h3>
            <span className="shrink-0 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              {question.points} {question.points === 1 ? 'درجة' : 'درجات'}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {question.options.map((option, optIdx) => {
              const isCorrect = option === question.correctAnswer
              return (
                <div
                  key={optIdx}
                  className={cn(
                    'flex items-center justify-between rounded-lg border p-3 text-sm transition-colors',
                    isCorrect
                      ? 'border-success/30 bg-success/5 text-success font-medium'
                      : 'border-border bg-secondary/30 text-muted-foreground'
                  )}
                >
                  <span>{option}</span>
                  {isCorrect && <CheckCircle2 className="size-4 shrink-0" />}
                </div>
              )
            })}
          </div>
        </Card>
      ))}
    </div>
  )
}

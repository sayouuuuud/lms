'use client'

import { Card } from '@/components/ui/card'
import { CheckCircle2, Circle, HelpCircle } from 'lucide-react'
import type { ExamQuestion } from '@/app/admin/exams/[id]/actions'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

export function ExamQuestionsList({ questions }: { questions: ExamQuestion[] }) {
  if (questions.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed bg-secondary/30">
        <div className="rounded-full bg-secondary p-4 mb-4 shadow-inner">
          <HelpCircle className="size-8 text-muted-foreground opacity-50" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">لا توجد أسئلة</h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-sm">
          لم يتم إضافة أي أسئلة لهذا الاختبار حتى الآن. يمكنك إضافة أسئلة جديدة من خلال صفحة التعديل.
        </p>
      </Card>
    )
  }

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const item = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  }

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-5"
    >
      {questions.map((question, index) => (
        <motion.div key={question.id} variants={item}>
          <Card className="overflow-hidden transition-all duration-300 hover:shadow-md border-border/60">
            <div className="bg-secondary/40 px-6 py-4 border-b">
              <div className="flex items-start justify-between gap-4">
                <h3 className="font-semibold text-lg leading-relaxed text-foreground flex items-start">
                  <span className="shrink-0 flex items-center justify-center size-7 rounded-full bg-primary/10 text-primary font-bold text-sm ml-3 mt-0.5 border border-primary/20">
                    {index + 1}
                  </span>
                  {question.text}
                </h3>
                <span className="shrink-0 rounded-full bg-background border px-3 py-1 text-xs font-semibold text-muted-foreground shadow-sm">
                  {question.points} {question.points === 1 ? 'درجة' : 'درجات'}
                </span>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {question.options.map((option, optIdx) => {
                  const isCorrect = option === question.correctAnswer
                  return (
                    <div
                      key={optIdx}
                      className={cn(
                        'group flex items-center justify-between rounded-xl border p-4 text-sm transition-all duration-200',
                        isCorrect
                          ? 'border-success/40 bg-success/10 text-success font-medium shadow-sm'
                          : 'border-border/60 bg-background hover:bg-secondary/50 text-muted-foreground hover:border-border'
                      )}
                    >
                      <span className="leading-relaxed">{option}</span>
                      {isCorrect ? (
                        <CheckCircle2 className="size-5 shrink-0" />
                      ) : (
                        <Circle className="size-4 shrink-0 opacity-20 group-hover:opacity-40 transition-opacity" />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  )
}

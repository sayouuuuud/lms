'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  AlarmClock,
  ArrowRight,
  Award,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileQuestion,
  ListChecks,
  RotateCcw,
  Send,
  XCircle,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Exam } from '@/lib/student-exams-data'

const OPTION_LABELS = ['أ', 'ب', 'ج', 'د', 'هـ']

type Phase = 'intro' | 'taking' | 'result'

function formatTime(total: number) {
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function ExamDetail({ exam }: { exam: Exam }) {
  const isCompleted = exam.status === 'مكتمل'
  const [phase, setPhase] = useState<Phase>(isCompleted ? 'result' : 'intro')
  // للاختبارات المكتملة نعرض الإجابات الصحيحة محفوظة في وضع المراجعة
  const [answers, setAnswers] = useState<Record<string, number>>(() =>
    isCompleted
      ? Object.fromEntries(exam.questions.map((q) => [q.id, q.correctIndex]))
      : {},
  )
  const [secondsLeft, setSecondsLeft] = useState(exam.durationMinutes * 60)

  // عدّاد تنازلي أثناء أداء الاختبار
  useEffect(() => {
    if (phase !== 'taking') return
    if (secondsLeft <= 0) {
      setPhase('result')
      return
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [phase, secondsLeft])

  const questions = exam.questions
  const answeredCount = questions.filter((q) => answers[q.id] != null).length
  const allAnswered = answeredCount === questions.length
  const progress = Math.round((answeredCount / questions.length) * 100)

  // للاختبارات المكتملة نعرض درجة محفوظة، وإلا نحسبها من الإجابات
  const computedCorrect = questions.filter(
    (q) => answers[q.id] === q.correctIndex,
  ).length
  const computedScore = Math.round(
    (computedCorrect / questions.length) * exam.totalPoints,
  )
  const finalScore = isCompleted ? (exam.score ?? 0) : computedScore
  const finalPercent = Math.round((finalScore / exam.totalPoints) * 100)
  // عدد الإجابات الصحيحة المعروض: مشتقّ من الدرجة المحفوظة للاختبار المكتمل
  const correctCount = isCompleted
    ? Math.round((finalPercent / 100) * questions.length)
    : computedCorrect
  const passed = finalPercent >= exam.passingPercent
  // في وضع المراجعة نُظهر التصحيح دائماً
  const reviewing = phase === 'result'

  const meta = [
    { label: 'عدد الأسئلة', value: `${questions.length}`, icon: FileQuestion },
    { label: 'المدة', value: `${exam.durationMinutes} دقيقة`, icon: Clock },
    { label: 'الدرجة الكلية', value: `${exam.totalPoints} نقطة`, icon: Award },
    { label: 'حد النجاح', value: `${exam.passingPercent}%`, icon: ListChecks },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <Link
        href="/student/exams"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowRight className="size-4" />
        كل الاختبارات
      </Link>

      {/* Header */}
      <Card className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ClipboardList className="size-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground text-balance">
                {exam.title}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {exam.course} · {exam.instructor}
              </p>
            </div>
          </div>
          {phase === 'taking' && (
            <span className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary/10 px-3 py-2 text-sm font-bold text-primary tabular-nums">
              <AlarmClock className="size-4" />
              {formatTime(secondsLeft)}
            </span>
          )}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {meta.map((m) => (
            <div
              key={m.label}
              className="flex items-center gap-3 rounded-xl border border-border p-3"
            >
              <m.icon className="size-5 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">{m.label}</p>
                <p className="text-sm font-semibold text-foreground">{m.value}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Intro */}
      {phase === 'intro' && (
        <Card className="p-6">
          <h2 className="mb-3 text-lg font-bold text-foreground">عن الاختبار</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {exam.description}
          </p>

          <h3 className="mb-3 mt-6 text-base font-bold text-foreground">
            المواضيع المشمولة
          </h3>
          <div className="flex flex-wrap gap-2">
            {exam.topics.map((t) => (
              <span
                key={t}
                className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-foreground"
              >
                {t}
              </span>
            ))}
          </div>

          <h3 className="mb-3 mt-6 flex items-center gap-2 text-base font-bold text-foreground">
            <ListChecks className="size-5 text-primary" />
            تعليمات هامة
          </h3>
          <ul className="flex flex-col gap-2.5">
            {exam.instructions.map((ins, i) => (
              <li
                key={i}
                className="flex items-start gap-3 text-sm text-foreground"
              >
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {i + 1}
                </span>
                {ins}
              </li>
            ))}
          </ul>

          <div className="mt-6 flex items-center gap-3 rounded-xl bg-amber-500/10 p-4 text-amber-600 dark:text-amber-400">
            <AlarmClock className="size-5 shrink-0" />
            <p className="text-sm">
              بمجرد بدء الاختبار سيبدأ العدّاد ({exam.durationMinutes} دقيقة). تأكد
              من جاهزيتك قبل المتابعة.
            </p>
          </div>

          <Button className="mt-6 w-fit" onClick={() => setPhase('taking')}>
            <ClipboardList className="size-4" />
            بدء الاختبار الآن
          </Button>
        </Card>
      )}

      {/* Taking / Result */}
      {(phase === 'taking' || phase === 'result') && (
        <>
          {/* Progress (while taking) */}
          {phase === 'taking' && (
            <Card className="p-5">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">
                  تقدّمك في الإجابة
                </span>
                <span className="text-muted-foreground">
                  {answeredCount}/{questions.length}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </Card>
          )}

          {/* Result banner */}
          {phase === 'result' && (
            <Card
              className={cn(
                'flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between',
              )}
            >
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    'flex size-14 shrink-0 items-center justify-center rounded-2xl',
                    passed
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-destructive/10 text-destructive',
                  )}
                >
                  {passed ? (
                    <CheckCircle2 className="size-7" />
                  ) : (
                    <XCircle className="size-7" />
                  )}
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">
                    {passed ? 'مبروك، لقد اجتزت الاختبار!' : 'لم تجتز الاختبار'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    أجبت {correctCount} من {questions.length} بشكل صحيح · حد النجاح{' '}
                    {exam.passingPercent}%
                  </p>
                </div>
              </div>
              <div className="text-center">
                <p
                  className={cn(
                    'text-3xl font-bold tabular-nums',
                    passed
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-destructive',
                  )}
                >
                  {finalPercent}%
                </p>
                <p className="text-xs text-muted-foreground">
                  {finalScore}/{exam.totalPoints} نقطة
                </p>
              </div>
            </Card>
          )}

          {/* Questions */}
          <Card className="p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">
                {reviewing ? 'مراجعة الإجابات' : 'أسئلة الاختبار'}
              </h2>
              <span className="text-xs text-muted-foreground">
                {questions.length} أسئلة
              </span>
            </div>

            <ol className="flex flex-col gap-7">
              {questions.map((q, qi) => (
                <li key={q.id} className="flex flex-col gap-3">
                  <p className="flex gap-2 text-sm font-semibold text-foreground">
                    <span className="text-primary">{qi + 1}.</span>
                    {q.question}
                  </p>
                  <div className="flex flex-col gap-2">
                    {q.options.map((opt, oi) => {
                      const selected = answers[q.id] === oi
                      const isCorrect = oi === q.correctIndex
                      return (
                        <button
                          key={oi}
                          type="button"
                          disabled={reviewing}
                          onClick={() =>
                            setAnswers((prev) => ({ ...prev, [q.id]: oi }))
                          }
                          className={cn(
                            'flex items-center gap-3 rounded-xl border p-3 text-right text-sm transition-colors',
                            !reviewing &&
                              (selected
                                ? 'border-primary bg-primary/5 text-foreground'
                                : 'border-border text-foreground hover:bg-secondary/50'),
                            reviewing &&
                              isCorrect &&
                              'border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                            reviewing &&
                              selected &&
                              !isCorrect &&
                              'border-destructive/50 bg-destructive/10 text-destructive',
                            reviewing &&
                              !isCorrect &&
                              !selected &&
                              'border-border text-muted-foreground',
                          )}
                        >
                          <span
                            className={cn(
                              'flex size-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold',
                              selected
                                ? 'border-current'
                                : 'border-muted-foreground/40 text-muted-foreground',
                            )}
                          >
                            {OPTION_LABELS[oi] ?? oi + 1}
                          </span>
                          <span className="flex-1">{opt}</span>
                          {reviewing && isCorrect && (
                            <CheckCircle2 className="size-4 shrink-0" />
                          )}
                          {reviewing && selected && !isCorrect && (
                            <XCircle className="size-4 shrink-0" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </li>
              ))}
            </ol>

            {phase === 'taking' && (
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Button onClick={() => setPhase('result')} disabled={!allAnswered}>
                  <Send className="size-4" />
                  تسليم الاختبار
                </Button>
                {!allAnswered && (
                  <p className="text-xs text-muted-foreground">
                    أجب عن كل الأسئلة لتتمكّن من التسليم ({answeredCount}/
                    {questions.length})
                  </p>
                )}
              </div>
            )}

            {phase === 'result' && !isCompleted && (
              <Button
                variant="outline"
                className="mt-6 w-fit"
                onClick={() => {
                  setAnswers({})
                  setSecondsLeft(exam.durationMinutes * 60)
                  setPhase('intro')
                }}
              >
                <RotateCcw className="size-4" />
                إعادة المحاولة
              </Button>
            )}
          </Card>
        </>
      )}
    </div>
  )
}

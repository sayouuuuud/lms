'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  Award,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Download,
  FileText,
  ListChecks,
  Paperclip,
  Send,
  UploadCloud,
  XCircle,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type {
  Assignment,
  AssignmentStatus,
  CourseDetail,
} from '@/lib/student-courses-data'

const statusStyles: Record<AssignmentStatus, string> = {
  'لم يبدأ': 'bg-secondary text-muted-foreground',
  'قيد التنفيذ': 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  'تم التسليم': 'bg-primary/15 text-primary',
  'مصحّح': 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
}

export function AssignmentDetail({
  assignment,
  course,
}: {
  assignment: Assignment
  course?: CourseDetail
}) {
  const [text, setText] = useState('')
  const [files, setFiles] = useState<string[]>([])
  const [status, setStatus] = useState<AssignmentStatus>(assignment.status)
  const submitted = status === 'تم التسليم' || status === 'مصحّح'

  const isQuiz = assignment.type === 'اختبار'
  const questions = assignment.questions ?? []

  // إجابات الاختبار: معرّف السؤال -> رقم الخيار المختار
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [quizSubmitted, setQuizSubmitted] = useState(
    assignment.status === 'مصحّح' || assignment.status === 'تم التسليم',
  )
  const correctCount = questions.filter(
    (q) => answers[q.id] === q.correctIndex,
  ).length
  const quizScore =
    questions.length > 0
      ? Math.round((correctCount / questions.length) * assignment.points)
      : 0
  const quizPercent =
    questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0
  const allAnswered = questions.every((q) => answers[q.id] != null)
  const displayScore = isQuiz && quizSubmitted ? quizScore : assignment.score

  const handleSubmit = () => {
    if (!text.trim() && files.length === 0) return
    setStatus('تم التسليم')
  }

  const handleQuizSubmit = () => {
    if (!allAnswered) return
    setQuizSubmitted(true)
    setStatus('مصحّح')
  }

  const handleFiles = (list: FileList | null) => {
    if (!list) return
    setFiles((prev) => [...prev, ...Array.from(list).map((f) => f.name)])
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <Link
        href={course ? `/student/courses/${course.id}` : '/student/courses'}
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowRight className="size-4" />
        {course ? course.title : 'العودة'}
      </Link>

      {/* Header */}
      <Card className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              {isQuiz ? (
                <ClipboardList className="size-6" />
              ) : (
                <FileText className="size-6" />
              )}
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground text-balance">
                {assignment.title}
              </h1>
              {course && (
                <p className="mt-1 text-sm text-muted-foreground">{course.title}</p>
              )}
            </div>
          </div>
          <span
            className={cn(
              'shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold',
              statusStyles[status],
            )}
          >
            {status}
          </span>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-xl border border-border p-3">
            <CalendarClock className="size-5 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">موعد التسليم</p>
              <p className="text-sm font-semibold text-foreground">
                {assignment.dueDate}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-border p-3">
            <Award className="size-5 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">الدرجة</p>
              <p className="text-sm font-semibold text-foreground">
                {assignment.points} نقطة
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-border p-3">
            <CheckCircle2 className="size-5 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">نتيجتك</p>
              <p className="text-sm font-semibold text-foreground">
                {displayScore != null
                  ? `${displayScore}/${assignment.points}`
                  : '—'}
              </p>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card className="p-6">
            <h2 className="mb-3 text-lg font-bold text-foreground">وصف الواجب</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {assignment.description}
            </p>

            <h3 className="mb-3 mt-6 flex items-center gap-2 text-base font-bold text-foreground">
              <ListChecks className="size-5 text-primary" />
              المطلوب منك
            </h3>
            <ul className="flex flex-col gap-2.5">
              {assignment.instructions.map((ins, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-foreground">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {i + 1}
                  </span>
                  {ins}
                </li>
              ))}
            </ul>
          </Card>

          {/* Quiz */}
          {isQuiz ? (
            <Card className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-foreground">أسئلة الاختبار</h2>
                <span className="text-xs text-muted-foreground">
                  {questions.length} أسئلة
                </span>
              </div>

              {quizSubmitted && (
                <div
                  className={cn(
                    'mb-5 flex items-center gap-3 rounded-xl p-4',
                    quizPercent >= 60
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-destructive/10 text-destructive',
                  )}
                >
                  {quizPercent >= 60 ? (
                    <CheckCircle2 className="size-6 shrink-0" />
                  ) : (
                    <XCircle className="size-6 shrink-0" />
                  )}
                  <div>
                    <p className="text-sm font-semibold">
                      {quizPercent >= 60 ? 'أحسنت، لقد نجحت!' : 'لم تجتز الاختبار'}
                    </p>
                    <p className="text-xs">
                      أجبت {correctCount} من {questions.length} بشكل صحيح • النتيجة{' '}
                      {quizScore}/{assignment.points} ({quizPercent}%)
                    </p>
                  </div>
                </div>
              )}

              <ol className="flex flex-col gap-6">
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
                        const showState = quizSubmitted
                        return (
                          <button
                            key={oi}
                            type="button"
                            disabled={quizSubmitted}
                            onClick={() =>
                              setAnswers((prev) => ({ ...prev, [q.id]: oi }))
                            }
                            className={cn(
                              'flex items-center gap-3 rounded-xl border p-3 text-right text-sm transition-colors',
                              !showState &&
                                (selected
                                  ? 'border-primary bg-primary/5 text-foreground'
                                  : 'border-border text-foreground hover:bg-secondary/50'),
                              showState &&
                                isCorrect &&
                                'border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                              showState &&
                                selected &&
                                !isCorrect &&
                                'border-destructive/50 bg-destructive/10 text-destructive',
                              showState &&
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
                              {['أ', 'ب', 'ج', 'د'][oi] ?? oi + 1}
                            </span>
                            <span className="flex-1">{opt}</span>
                            {showState && isCorrect && (
                              <CheckCircle2 className="size-4 shrink-0" />
                            )}
                            {showState && selected && !isCorrect && (
                              <XCircle className="size-4 shrink-0" />
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </li>
                ))}
              </ol>

              {!quizSubmitted && (
                <Button
                  onClick={handleQuizSubmit}
                  disabled={!allAnswered}
                  className="mt-6 w-fit"
                >
                  <Send className="size-4" />
                  تسليم الاختبار
                </Button>
              )}
            </Card>
          ) : (
          /* Submission */
          <Card className="p-6">
            <h2 className="mb-4 text-lg font-bold text-foreground">تسليم الواجب</h2>

            {status === 'مصحّح' ? (
              <div className="flex items-center gap-3 rounded-xl bg-emerald-500/10 p-4 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-6 shrink-0" />
                <div>
                  <p className="text-sm font-semibold">تم تصحيح الواجب</p>
                  <p className="text-xs">
                    حصلت على {assignment.score} من {assignment.points} نقطة. أحسنت!
                  </p>
                </div>
              </div>
            ) : submitted ? (
              <div className="flex items-center gap-3 rounded-xl bg-primary/10 p-4 text-primary">
                <CheckCircle2 className="size-6 shrink-0" />
                <div>
                  <p className="text-sm font-semibold">تم تسليم الواجب بنجاح</p>
                  <p className="text-xs">سيتم تصحيحه من قبل المدرّب قريباً.</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div>
                  <label
                    htmlFor="answer"
                    className="mb-1.5 block text-sm font-medium text-foreground"
                  >
                    إجابتك / ملاحظاتك
                  </label>
                  <textarea
                    id="answer"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={5}
                    placeholder="اكتب إجابتك أو رابط مشروعك هنا..."
                    className="w-full resize-none rounded-xl border border-border bg-secondary/40 p-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:bg-card"
                  />
                </div>

                <div>
                  <p className="mb-1.5 text-sm font-medium text-foreground">
                    إرفاق ملفات
                  </p>
                  <label
                    htmlFor="files"
                    className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-secondary/30 p-6 text-center transition-colors hover:bg-secondary/50"
                  >
                    <UploadCloud className="size-7 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">
                      اسحب الملفات هنا أو اضغط للرفع
                    </span>
                    <span className="text-xs text-muted-foreground">
                      PDF، صور، ZIP حتى 25 ميجابايت
                    </span>
                    <input
                      id="files"
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => handleFiles(e.target.files)}
                    />
                  </label>

                  {files.length > 0 && (
                    <ul className="mt-3 flex flex-col gap-2">
                      {files.map((f, i) => (
                        <li
                          key={`${f}-${i}`}
                          className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-foreground"
                        >
                          <Paperclip className="size-4 text-muted-foreground" />
                          <span className="truncate">{f}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={!text.trim() && files.length === 0}
                  className="w-fit"
                >
                  <Send className="size-4" />
                  تسليم الواجب
                </Button>
              </div>
            )}
          </Card>
          )}
        </div>

        {/* Sidebar: attachments */}
        <div className="flex flex-col gap-6">
          <Card className="p-6">
            <h2 className="mb-4 text-lg font-bold text-foreground">ملفات الواجب</h2>
            {assignment.attachments.length === 0 ? (
              <p className="text-sm text-muted-foreground">لا توجد ملفات مرفقة.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {assignment.attachments.map((file) => (
                  <li
                    key={file.name}
                    className="flex items-center gap-3 rounded-xl border border-border p-3"
                  >
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                      <FileText className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">{file.size}</p>
                    </div>
                    <button
                      type="button"
                      className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                      aria-label={`تنزيل ${file.name}`}
                    >
                      <Download className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

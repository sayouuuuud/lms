'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ClipboardList, Plus, Trash2, Check, Pencil } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/modal'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { cn } from '@/lib/utils'
import {
  type AdminExam,
  type AdminExamQuestion,
  saveLectureExam,
  deleteLectureExam,
} from '@/app/admin/courses/actions'

const textareaClass =
  'w-full resize-none rounded-xl border border-border bg-secondary/60 px-4 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:bg-card'

type EditableQuestion = AdminExamQuestion

function blankQuestion(): EditableQuestion {
  return { question: '', options: ['', '', '', ''], correctIndex: 0 }
}

export function LectureExamEditor({
  lectureId,
  lectureTitle,
  exam,
}: {
  lectureId: string
  lectureTitle: string
  exam: AdminExam | null
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saving, setSaving] = useState(false)

  const [title, setTitle] = useState(exam?.title ?? `اختبار: ${lectureTitle}`)
  const [description, setDescription] = useState(
    exam?.description ??
      `اختبار قصير لقياس فهمك لمحاضرة «${lectureTitle}». اجتزه بعد إكمال دروس المحاضرة.`,
  )
  const [points, setPoints] = useState(String(exam?.points ?? 10))
  const [questions, setQuestions] = useState<EditableQuestion[]>(
    exam?.questions.length ? exam.questions : [blankQuestion()],
  )

  const updateQuestion = (i: number, patch: Partial<EditableQuestion>) =>
    setQuestions((qs) => qs.map((q, idx) => (idx === i ? { ...q, ...patch } : q)))

  const updateOption = (qi: number, oi: number, value: string) =>
    setQuestions((qs) =>
      qs.map((q, idx) =>
        idx === qi
          ? { ...q, options: q.options.map((o, j) => (j === oi ? value : o)) }
          : q,
      ),
    )

  const handleSave = async () => {
    const cleaned = questions
      .map((q) => ({
        ...q,
        question: q.question.trim(),
        options: q.options.map((o) => o.trim()),
      }))
      .filter((q) => q.question && q.options.every((o) => o))

    if (!title.trim()) return toast.error('اكتب عنوان الاختبار')
    if (cleaned.length === 0)
      return toast.error('أضف سؤالاً واحداً على الأقل بخيارات مكتملة')

    setSaving(true)
    const res = await saveLectureExam(lectureId, {
      title: title.trim(),
      description: description.trim(),
      instructions: [
        'أجب عن جميع الأسئلة',
        'لكل سؤال إجابة واحدة صحيحة',
        'تحتاج إلى 60% على الأقل للنجاح',
      ],
      points: Number(points) || 10,
      questions: cleaned,
    })
    setSaving(false)
    if (res.error) return toast.error(res.error)
    toast.success('تم حفظ الاختبار')
    setEditing(false)
    router.refresh()
  }

  const handleDelete = async () => {
    setConfirmDelete(false)
    const res = await deleteLectureExam(lectureId)
    if (res.error) return toast.error(res.error)
    toast.success('تم حذف الاختبار')
    setEditing(false)
    router.refresh()
  }

  // ── Read-only summary ──
  if (!editing) {
    return (
      <Card className="p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ClipboardList className="size-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                {exam ? exam.title : 'لا يوجد اختبار لهذه المحاضرة'}
              </h3>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {exam
                  ? `${exam.questions.length} سؤال • ${exam.points} نقطة`
                  : 'أضف اختباراً يظهر للطالب بعد إكمال دروس المحاضرة.'}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button size="sm" onClick={() => setEditing(true)}>
              {exam ? (
                <>
                  <Pencil className="size-4" /> تعديل الاختبار
                </>
              ) : (
                <>
                  <Plus className="size-4" /> إضافة اختبار
                </>
              )}
            </Button>
            {exam && (
              <Button
                size="sm"
                variant="outline"
                className="border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-500/30 dark:hover:bg-rose-500/10"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="size-4" />
                <span className="sr-only">حذف الاختبار</span>
              </Button>
            )}
          </div>
        </div>

        {exam && exam.questions.length > 0 && (
          <ul className="mt-4 space-y-2">
            {exam.questions.map((q, i) => (
              <li
                key={q.id ?? i}
                className="rounded-xl border border-border bg-secondary/30 px-4 py-3 text-sm"
              >
                <p className="font-semibold text-foreground">
                  {i + 1}. {q.question}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  الإجابة الصحيحة: {q.options[q.correctIndex]}
                </p>
              </li>
            ))}
          </ul>
        )}

        <ConfirmDialog
          open={confirmDelete}
          onClose={() => setConfirmDelete(false)}
          onConfirm={handleDelete}
          title="حذف الاختبار"
          description="هل أنت متأكد من حذف اختبار هذه المحاضرة؟ سيتم حذف كل الأسئلة. لا يمكن التراجع."
        />
      </Card>
    )
  }

  // ── Edit form ──
  return (
    <Card className="p-5">
      <div className="space-y-4">
        <Field label="عنوان الاختبار">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="الوصف">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className={textareaClass}
          />
        </Field>
        <div className="max-w-[12rem]">
          <Field label="النقاط الكلية">
            <Input
              type="number"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
            />
          </Field>
        </div>

        <div className="space-y-4">
          <p className="text-sm font-bold text-foreground">الأسئلة</p>
          {questions.map((q, qi) => (
            <div
              key={qi}
              className="space-y-3 rounded-xl border border-border bg-secondary/30 p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-muted-foreground">
                  السؤال {qi + 1}
                </span>
                {questions.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                    onClick={() =>
                      setQuestions((qs) => qs.filter((_, idx) => idx !== qi))
                    }
                  >
                    <Trash2 className="size-3.5" />
                    <span className="sr-only">حذف السؤال</span>
                  </Button>
                )}
              </div>
              <Input
                value={q.question}
                onChange={(e) => updateQuestion(qi, { question: e.target.value })}
                placeholder="نص السؤال"
              />
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {q.options.map((opt, oi) => {
                  const correct = q.correctIndex === oi
                  return (
                    <div key={oi} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateQuestion(qi, { correctIndex: oi })}
                        className={cn(
                          'flex size-7 shrink-0 items-center justify-center rounded-lg border text-xs transition-colors',
                          correct
                            ? 'border-emerald-500 bg-emerald-500 text-white'
                            : 'border-border text-muted-foreground hover:bg-secondary',
                        )}
                        aria-label="تعيين كإجابة صحيحة"
                      >
                        {correct ? <Check className="size-4" /> : oi + 1}
                      </button>
                      <Input
                        value={opt}
                        onChange={(e) => updateOption(qi, oi, e.target.value)}
                        placeholder={`الخيار ${oi + 1}`}
                      />
                    </div>
                  )
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                اضغط على الرقم بجوار الخيار لتعيينه كإجابة صحيحة.
              </p>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full border-dashed"
            onClick={() => setQuestions((qs) => [...qs, blankQuestion()])}
          >
            <Plus className="size-4" />
            إضافة سؤال
          </Button>
        </div>

        <div className="flex justify-start gap-2 pt-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'جاري الحفظ...' : 'حفظ الاختبار'}
          </Button>
          <Button variant="outline" onClick={() => setEditing(false)}>
            إلغاء
          </Button>
        </div>
      </div>
    </Card>
  )
}

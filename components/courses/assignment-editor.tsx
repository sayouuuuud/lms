'use client'

import { useState } from 'react'
import { Trash2, Plus, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Modal, Field } from '@/components/ui/modal'
import type {
  AdminAssignment,
  AdminAssignmentQuestion,
  AssignmentInput,
  QuestionKind,
} from '@/app/admin/courses/actions'
import {
  createAssignment,
  updateAssignment,
  deleteAssignment,
} from '@/app/admin/courses/actions'

export function AssignmentEditor({
  lectureId,
  assignment,
  onClose,
  onSuccess,
}: {
  lectureId: string
  assignment?: AdminAssignment
  onClose: () => void
  onSuccess: () => void
}) {
  const isEdit = !!assignment
  const [title, setTitle] = useState(assignment?.title ?? '')
  const [description, setDescription] = useState(assignment?.description ?? '')
  const [points, setPoints] = useState((assignment?.points ?? 10).toString())
  const [questions, setQuestions] = useState<AdminAssignmentQuestion[]>(
    assignment?.questions ?? [],
  )
  const [saving, setSaving] = useState(false)

  const addQuestion = () => {
    setQuestions([
      ...questions,
      { kind: 'mcq', question: '', options: ['', '', '', ''], correctIndex: 0 },
    ])
  }

  const updateQuestion = (
    index: number,
    updates: Partial<AdminAssignmentQuestion>,
  ) => {
    const newQuestions = [...questions]
    newQuestions[index] = { ...newQuestions[index], ...updates }
    setQuestions(newQuestions)
  }

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('عنوان الواجب مطلوب')
      return
    }
    if (questions.length === 0) {
      toast.error('يجب إضافة سؤال واحد على الأقل')
      return
    }

    setSaving(true)
    const input: AssignmentInput = {
      title,
      description,
      points: parseInt(points) || 10,
      questions,
    }

    const result = isEdit
      ? await updateAssignment(assignment!.id, input)
      : await createAssignment(lectureId, input)

    setSaving(false)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(isEdit ? 'تم تحديث الواجب' : 'تم إنشاء الواجب')
      onSuccess()
      onClose()
    }
  }

  const handleDelete = async () => {
    if (!confirm('هل أنت متأكد من حذف هذا الواجب؟')) return
    setSaving(true)
    const result = await deleteAssignment(assignment!.id)
    setSaving(false)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('تم حذف الواجب')
      onSuccess()
      onClose()
    }
  }

  return (
    <Modal
      open={true}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title={isEdit ? 'تعديل الواجب' : 'إضافة واجب جديد'}
    >
      <div className="space-y-4">
        <Field label="العنوان">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="مثلاً: واجب الفصل الأول"
            dir="rtl"
          />
        </Field>

        <Field label="الوصف">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="تفاصيل الواجب والمتطلبات..."
            rows={3}
            dir="rtl"
          />
        </Field>

        <Field label="الدرجات">
          <Input
            type="number"
            min="1"
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            placeholder="10"
          />
        </Field>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-right text-sm font-medium">الأسئلة</label>
            <Button
              size="sm"
              variant="outline"
              onClick={addQuestion}
              className="h-8"
            >
              <Plus className="size-4" />
              إضافة سؤال
            </Button>
          </div>

          <div className="space-y-3">
            {questions.map((q, i) => (
              <QuestionEditor
                key={i}
                question={q}
                index={i}
                onUpdate={(updates) => updateQuestion(i, updates)}
                onRemove={() => removeQuestion(i)}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-border pt-4">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="flex-1"
          >
            {saving ? 'جاري الحفظ...' : 'حفظ الواجب'}
          </Button>
          {isEdit && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={saving}
              className="h-9"
            >
              <Trash2 className="size-4" />
              حذف
            </Button>
          )}
          <Button
            variant="outline"
            onClick={onClose}
            disabled={saving}
            className="h-9"
          >
            إلغاء
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function QuestionEditor({
  question,
  index,
  onUpdate,
  onRemove,
}: {
  question: AdminAssignmentQuestion
  index: number
  onUpdate: (updates: Partial<AdminAssignmentQuestion>) => void
  onRemove: () => void
}) {
  return (
    <div className="space-y-2 rounded-lg border border-border bg-secondary/30 p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground">
          السؤال {index + 1}
        </span>
        <select
          value={question.kind}
          onChange={(e) => onUpdate({ kind: e.target.value as QuestionKind })}
          className="h-7 rounded border border-border bg-background text-xs"
        >
          <option value="mcq">اختيار من متعدد</option>
          <option value="essay">مقالي</option>
          <option value="file">رفع ملف</option>
        </select>
        <button
          onClick={onRemove}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      <Textarea
        value={question.question}
        onChange={(e) => onUpdate({ question: e.target.value })}
        placeholder="صيغة السؤال"
        rows={2}
        dir="rtl"
        className="text-sm"
      />

      {question.kind === 'mcq' && (
        <div className="space-y-2">
          {question.options.map((option, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="radio"
                checked={question.correctIndex === i}
                onChange={() => onUpdate({ correctIndex: i })}
                className="size-4"
              />
              <Input
                value={option}
                onChange={(e) => {
                  const newOptions = [...question.options]
                  newOptions[i] = e.target.value
                  onUpdate({ options: newOptions })
                }}
                placeholder={`الخيار ${i + 1}`}
                className="text-sm"
                dir="rtl"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

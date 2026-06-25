'use client'

import { useEffect, useState } from 'react'
import { Modal, Field } from '@/components/ui/modal'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { eventTypes, type CalendarEventType } from '@/lib/calendar-data'
import { useCalendar } from './calendar-context'

export function EventFormModal() {
  const {
    formOpen,
    editing,
    presetDate,
    closeForm,
    submitForm,
    deleting,
    closeDelete,
    confirmDelete,
  } = useCalendar()

  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [type, setType] = useState<CalendarEventType>('حدث مخصص')
  const [course, setCourse] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    if (formOpen) {
      setTitle(editing?.title ?? '')
      setDate(editing?.date ?? presetDate ?? new Date().toISOString().slice(0, 10))
      setTime(editing?.time ?? '10:00')
      setType(editing?.type ?? 'حدث مخصص')
      setCourse(editing?.course ?? '')
      setDescription(editing?.description ?? '')
    }
  }, [formOpen, editing, presetDate])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !date) return
    submitForm({
      title: title.trim(),
      date,
      time: time || '10:00',
      type,
      course: course.trim() || undefined,
      description: description.trim() || undefined,
    })
  }

  const inputCls =
    'h-11 w-full rounded-xl border border-border bg-secondary/60 px-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:bg-card'

  return (
    <>
      <Modal
        open={formOpen}
        onClose={closeForm}
        title={editing ? 'تعديل الحدث' : 'إضافة حدث جديد'}
        description="حدّد عنوان الحدث وتاريخه ونوعه"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="عنوان الحدث">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: محاضرة مقدمة في البرمجة"
              autoFocus
            />
          </Field>

          <Field label="نوع الحدث">
            <div className="grid grid-cols-3 gap-2">
              {eventTypes.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={cn(
                    'rounded-xl border px-2 py-2.5 text-xs font-semibold transition-colors sm:text-sm',
                    type === t
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-secondary/60 text-muted-foreground hover:bg-secondary',
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="التاريخ">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={inputCls}
                dir="ltr"
              />
            </Field>
            <Field label="الوقت">
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className={inputCls}
                dir="ltr"
              />
            </Field>
          </div>

          <Field label="الكورس (اختياري)">
            <Input
              value={course}
              onChange={(e) => setCourse(e.target.value)}
              placeholder="اسم الكورس المرتبط بالحدث"
            />
          </Field>

          <Field label="الوصف (اختياري)">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="تفاصيل إضافية عن الحدث"
              rows={3}
              className={cn(inputCls, 'h-auto resize-none py-3 leading-relaxed')}
            />
          </Field>

          <div className="flex justify-start gap-2 pt-2">
            <Button type="submit">
              {editing ? 'حفظ التغييرات' : 'إضافة الحدث'}
            </Button>
            <Button type="button" variant="outline" onClick={closeForm}>
              إلغاء
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={closeDelete}
        onConfirm={confirmDelete}
        title="حذف الحدث"
        description={`هل أنت متأكد من حذف الحدث "${deleting?.title}"؟`}
      />
    </>
  )
}

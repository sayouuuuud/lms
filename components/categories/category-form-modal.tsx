'use client'

import { useEffect, useState } from 'react'
import { Modal, Field } from '@/components/ui/modal'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useCategories } from './categories-context'
import type { CategoryStatus } from '@/lib/categories-data'

const statuses: CategoryStatus[] = ['مفعّل', 'متوقف']

export function CategoryFormModal() {
  const {
    formOpen,
    editing,
    closeForm,
    submitForm,
    deleting,
    closeDelete,
    confirmDelete,
  } = useCategories()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<CategoryStatus>('مفعّل')

  useEffect(() => {
    if (formOpen) {
      setName(editing?.name ?? '')
      setDescription(editing?.description ?? '')
      setStatus(editing?.status ?? 'مفعّل')
    }
  }, [formOpen, editing])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    submitForm({ name: name.trim(), description: description.trim(), status })
  }

  return (
    <>
      <Modal
        open={formOpen}
        onClose={closeForm}
        title={editing ? 'تعديل التصنيف' : 'إضافة تصنيف جديد'}
        description="أدخل بيانات التصنيف لتنظيم الكورسات"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="اسم التصنيف">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: البرمجة"
              autoFocus
            />
          </Field>
          <Field label="الوصف">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="وصف مختصر للتصنيف"
              rows={3}
              className="w-full resize-none rounded-xl border border-border bg-secondary/60 px-4 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:bg-card"
            />
          </Field>
          <Field label="الحالة">
            <div className="flex gap-2">
              {statuses.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={cn(
                    'flex-1 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors',
                    status === s
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-secondary/60 text-muted-foreground hover:bg-secondary',
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </Field>
          <div className="flex justify-start gap-2 pt-2">
            <Button type="submit">{editing ? 'حفظ التغييرات' : 'إضافة التصنيف'}</Button>
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
        title="حذف التصنيف"
        description={`هل أنت متأكد من حذف تصنيف "${deleting?.name}"؟ لا يمكن التراجع عن هذا الإجراء.`}
      />
    </>
  )
}

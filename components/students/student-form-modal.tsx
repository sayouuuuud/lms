'use client'

import { useEffect, useState } from 'react'
import { Modal, Field } from '@/components/ui/modal'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useStudents } from './students-context'
import type { StudentGender, StudentStatus } from '@/lib/students-data'

const statuses: StudentStatus[] = ['نشط', 'غير نشط', 'موقوف']
const genders: StudentGender[] = ['ذكر', 'أنثى']

export function StudentFormModal() {
  const {
    formOpen,
    closeForm,
    submitForm,
    deleting,
    closeDelete,
    confirmDelete,
  } = useStudents()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [gender, setGender] = useState<StudentGender>('ذكر')
  const [status, setStatus] = useState<StudentStatus>('نشط')

  useEffect(() => {
    if (formOpen) {
      setName('')
      setEmail('')
      setPhone('')
      setGender('ذكر')
      setStatus('نشط')
    }
  }, [formOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !email.trim()) return
    submitForm({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      gender,
      status,
    })
  }

  return (
    <>
      <Modal
        open={formOpen}
        onClose={closeForm}
        title="إضافة طالب جديد"
        description="أدخل بيانات الطالب لتسجيله في المنصة"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="الاسم الكامل">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: محمد إبراهيم"
              autoFocus
            />
          </Field>
          <Field label="البريد الإلكتروني">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              dir="ltr"
            />
          </Field>
          <Field label="رقم الهاتف">
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0100 000 0000"
              dir="ltr"
            />
          </Field>
          <Field label="الجنس">
            <div className="flex gap-2">
              {genders.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGender(g)}
                  className={cn(
                    'flex-1 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors',
                    gender === g
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-secondary/60 text-muted-foreground hover:bg-secondary',
                  )}
                >
                  {g}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              لو الطالب مرفقش صورة، هيتحطله أفاتار تلقائي حسب الجنس.
            </p>
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
            <Button type="submit">إضافة الطالب</Button>
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
        title="حذف الطالب"
        description={`هل أنت متأكد من حذف الطالب "${deleting?.name}"؟`}
      />
    </>
  )
}

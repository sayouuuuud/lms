'use client'

import { useEffect, useState } from 'react'
import { Modal, Field } from '@/components/ui/modal'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useCoupons } from './coupons-context'
import type { CouponStatus, CouponType } from '@/lib/coupons-data'

const types: CouponType[] = ['نسبة مئوية', 'مبلغ ثابت']
const statuses: CouponStatus[] = ['نشط', 'منتهي', 'متوقف']

export function CouponFormModal() {
  const {
    formOpen,
    editing,
    closeForm,
    submitForm,
    deleting,
    closeDelete,
    confirmDelete,
  } = useCoupons()

  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<CouponType>('نسبة مئوية')
  const [value, setValue] = useState('')
  const [limit, setLimit] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [status, setStatus] = useState<CouponStatus>('نشط')

  useEffect(() => {
    if (formOpen) {
      setCode(editing?.code ?? '')
      setDescription(editing?.description ?? '')
      setType(editing?.type ?? 'نسبة مئوية')
      setValue(editing ? String(editing.value) : '')
      setLimit(editing ? String(editing.limit) : '')
      setStartDate(editing?.startDate ?? '')
      setEndDate(editing?.endDate ?? '')
      setStatus(editing?.status ?? 'نشط')
    }
  }, [formOpen, editing])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim()) return
    submitForm({
      code: code.trim().toUpperCase(),
      description: description.trim(),
      type,
      value: Number(value) || 0,
      limit: Number(limit) || 0,
      startDate: startDate || new Date().toISOString().slice(0, 10),
      endDate: endDate || new Date().toISOString().slice(0, 10),
      status,
    })
  }

  const inputCls =
    'h-11 w-full rounded-xl border border-border bg-secondary/60 px-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:bg-card'

  return (
    <>
      <Modal
        open={formOpen}
        onClose={closeForm}
        title={editing ? 'تعديل الكوبون' : 'إنشاء كوبون جديد'}
        description="حدّد كود الخصم وقيمته وفترة صلاحيته"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="كود الكوبون">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="مثال: WELCOME25"
              className="font-mono uppercase"
              autoFocus
            />
          </Field>
          <Field label="الوصف">
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="وصف مختصر للعرض"
            />
          </Field>
          <Field label="نوع الخصم">
            <div className="flex gap-2">
              {types.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={cn(
                    'flex-1 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors',
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
            <Field label={type === 'نسبة مئوية' ? 'النسبة (%)' : 'المبلغ (ج.م)'}>
              <input
                type="number"
                min={0}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="0"
                className={inputCls}
              />
            </Field>
            <Field label="حد الاستخدام">
              <input
                type="number"
                min={0}
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                placeholder="0"
                className={inputCls}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="تاريخ البدء">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={inputCls}
                dir="ltr"
              />
            </Field>
            <Field label="تاريخ الانتهاء">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={inputCls}
                dir="ltr"
              />
            </Field>
          </div>
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
            <Button type="submit">{editing ? 'حفظ التغييرات' : 'إنشاء الكوبون'}</Button>
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
        title="حذف الكوبون"
        description={`هل أنت متأكد من حذف الكوبون "${deleting?.code}"؟`}
      />
    </>
  )
}

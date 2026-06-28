'use client'

import { useEffect, useState } from 'react'
import { Modal, Field } from '@/components/ui/modal'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ImageUploadField } from '@/components/ui/image-upload-field'
import { cn } from '@/lib/utils'
import { useCurriculum } from './curriculum-context'

const textareaClass =
  'w-full resize-none rounded-xl border border-border bg-secondary/60 px-4 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:bg-card'

const accents: { value: 'emerald' | 'gold'; label: string }[] = [
  { value: 'emerald', label: 'زمردي' },
  { value: 'gold', label: 'ذهبي' },
]

export function CurriculumFormModals() {
  const {
    stageFormOpen,
    editingStage,
    closeStageForm,
    submitStageForm,
    deletingStage,
    closeDeleteStage,
    confirmDeleteStage,
    branchFormOpen,
    editingBranch,
    closeBranchForm,
    submitBranchForm,
    deletingBranch,
    closeDeleteBranch,
    confirmDeleteBranch,
  } = useCurriculum()

  // ── Stage form state ──
  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [idx, setIdx] = useState('')
  const [formula, setFormula] = useState('')
  const [rows, setRows] = useState('')
  const [accent, setAccent] = useState<'emerald' | 'gold'>('emerald')
  const [termPrice, setTermPrice] = useState('')
  const [termOldPrice, setTermOldPrice] = useState('')
  const [stageImage, setStageImage] = useState('')

  useEffect(() => {
    if (stageFormOpen) {
      setTitle(editingStage?.title ?? '')
      setSubtitle(editingStage?.subtitle ?? '')
      setIdx(editingStage?.idx ?? '')
      setFormula(editingStage?.formula ?? '')
      setRows((editingStage?.rows ?? []).join('\n'))
      setAccent(editingStage?.accent ?? 'emerald')
      setTermPrice(editingStage ? String(editingStage.termPrice) : '')
      setTermOldPrice(
        editingStage?.termOldPrice != null ? String(editingStage.termOldPrice) : '',
      )
      setStageImage(editingStage?.image ?? '')
    }
  }, [stageFormOpen, editingStage])

  const handleStageSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    submitStageForm({
      title: title.trim(),
      subtitle: subtitle.trim(),
      idx: idx.trim(),
      formula: formula.trim(),
      rows: rows.split('\n').map((r) => r.trim()).filter(Boolean),
      accent,
      termPrice: Number(termPrice) || 0,
      termOldPrice: termOldPrice ? Number(termOldPrice) : null,
      image: stageImage,
    })
  }

  // ── Branch form state ──
  const [bTitle, setBTitle] = useState('')
  const [bDescription, setBDescription] = useState('')
  const [bTopics, setBTopics] = useState('')
  const [bImage, setBImage] = useState('')

  useEffect(() => {
    if (branchFormOpen) {
      setBTitle(editingBranch?.title ?? '')
      setBDescription(editingBranch?.description ?? '')
      setBTopics((editingBranch?.topics ?? []).join('\n'))
      setBImage(editingBranch?.image ?? '')
    }
  }, [branchFormOpen, editingBranch])

  const handleBranchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!bTitle.trim()) return
    submitBranchForm({
      title: bTitle.trim(),
      description: bDescription.trim(),
      topics: bTopics.split('\n').map((t) => t.trim()).filter(Boolean),
      image: bImage,
    })
  }

  return (
    <>
      {/* Stage form */}
      <Modal
        open={stageFormOpen}
        onClose={closeStageForm}
        title={editingStage ? 'تعديل المرحلة' : 'إضافة مرحلة جديدة'}
        description="بيانات المرحلة كما تظهر للطلاب في الصفحة الرئيسية"
      >
        <form onSubmit={handleStageSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <Field label="اسم المرحلة">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: الصف الأول الثانوي"
                  autoFocus
                />
              </Field>
            </div>
            <Field label="الترتيب (رقم)">
              <Input
                value={idx}
                onChange={(e) => setIdx(e.target.value)}
                placeholder="٠١"
              />
            </Field>
          </div>

          <Field label="الوصف المختصر">
            <textarea
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="نبذة قصيرة عن المرحلة"
              rows={2}
              className={textareaClass}
            />
          </Field>

          <Field label="المحاور (كل محور في سطر)">
            <textarea
              value={rows}
              onChange={(e) => setRows(e.target.value)}
              placeholder={'الجبر والمتطابقات\nحساب المثلثات\nالهندسة التحليلية'}
              rows={3}
              className={textareaClass}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="المعادلة المميزة">
              <Input
                value={formula}
                onChange={(e) => setFormula(e.target.value)}
                placeholder="sin²θ + cos²θ = 1"
              />
            </Field>
            <Field label="اللون المميز">
              <div className="flex gap-2">
                {accents.map((a) => (
                  <button
                    key={a.value}
                    type="button"
                    onClick={() => setAccent(a.value)}
                    className={cn(
                      'flex-1 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors',
                      accent === a.value
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-secondary/60 text-muted-foreground hover:bg-secondary',
                    )}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="سعر الترم (ج)">
              <Input
                type="number"
                value={termPrice}
                onChange={(e) => setTermPrice(e.target.value)}
                placeholder="750"
              />
            </Field>
            <Field label="السعر قبل الخصم (اختياري)">
              <Input
                type="number"
                value={termOldPrice}
                onChange={(e) => setTermOldPrice(e.target.value)}
                placeholder="1100"
              />
            </Field>
          </div>

          <ImageUploadField
            label="صورة المرحلة"
            value={stageImage}
            onChange={setStageImage}
            hint="تظهر للطلاب على كارت المرحلة في الصفحة الرئيسية."
          />

          <div className="flex justify-start gap-2 pt-2">
            <Button type="submit">
              {editingStage ? 'حفظ التغييرات' : 'إضافة المرحلة'}
            </Button>
            <Button type="button" variant="outline" onClick={closeStageForm}>
              إلغاء
            </Button>
          </div>
        </form>
      </Modal>

      {/* Branch form */}
      <Modal
        open={branchFormOpen}
        onClose={closeBranchForm}
        title={editingBranch ? 'تعديل الفرع' : 'إضافة فرع جديد'}
        description="الفرع بيجمع مجموعة محاضرات داخل المرحلة"
      >
        <form onSubmit={handleBranchSubmit} className="space-y-4">
          <Field label="اسم الفرع">
            <Input
              value={bTitle}
              onChange={(e) => setBTitle(e.target.value)}
              placeholder="مثال: الجبر والمتطابقات"
              autoFocus
            />
          </Field>
          <Field label="الوصف">
            <textarea
              value={bDescription}
              onChange={(e) => setBDescription(e.target.value)}
              placeholder="وصف مختصر للفرع"
              rows={2}
              className={textareaClass}
            />
          </Field>
          <Field label="الموضوعات (كل موضوع في سطر)">
            <textarea
              value={bTopics}
              onChange={(e) => setBTopics(e.target.value)}
              placeholder={'الأعداد المركّبة\nالمتطابقات الشهيرة\nالمعادلات والمتباينات'}
              rows={3}
              className={textareaClass}
            />
          </Field>
          <ImageUploadField
            label="صورة الفرع"
            value={bImage}
            onChange={setBImage}
            hint="تظهر للطلاب على كارت الفرع."
          />
          <div className="flex justify-start gap-2 pt-2">
            <Button type="submit">
              {editingBranch ? 'حفظ التغييرات' : 'إضافة الفرع'}
            </Button>
            <Button type="button" variant="outline" onClick={closeBranchForm}>
              إلغاء
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirmations */}
      <ConfirmDialog
        open={!!deletingStage}
        onClose={closeDeleteStage}
        onConfirm={confirmDeleteStage}
        title="حذف المرحلة"
        description={`هل أنت متأكد من حذف مرحلة "${deletingStage?.title}"؟ سيتم حذف كل الفروع والمحاضرات التابعة لها. لا يمكن التراجع.`}
      />
      <ConfirmDialog
        open={!!deletingBranch}
        onClose={closeDeleteBranch}
        onConfirm={confirmDeleteBranch}
        title="حذف الفرع"
        description={`هل أنت متأكد من حذف فرع "${deletingBranch?.title}"؟ سيتم حذف كل المحاضرات التابعة له. لا يمكن التراجع.`}
      />
    </>
  )
}

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

  const [stageImage, setStageImage] = useState('')

  useEffect(() => {
    if (stageFormOpen) {
      setTitle(editingStage?.title ?? '')
      setSubtitle(editingStage?.subtitle ?? '')
      setIdx(editingStage?.idx ?? '')
      setRows((editingStage?.rows ?? []).join('\n'))
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
      rows: rows.split('\n').map((r) => r.trim()).filter(Boolean),
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
        title={editingStage ? 'تعديل التصنيف الرئيسي' : 'إضافة تصنيف رئيسي جديد'}
        description="بيانات التصنيف الرئيسي (السنة الدراسية) كما تظهر للطلاب"
      >
        <form onSubmit={handleStageSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <Field label="اسم التصنيف (مثل: الصف الأول الثانوي)">
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
              placeholder="نبذة قصيرة"
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



          <ImageUploadField
            label="صورة التصنيف"
            value={stageImage}
            onChange={setStageImage}
            hint="تظهر للطلاب على كارت التصنيف الرئيسي."
          />

          <div className="flex justify-start gap-2 pt-2">
            <Button type="submit">
              {editingStage ? 'حفظ التغييرات' : 'إضافة التصنيف'}
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
        title={editingBranch ? 'تعديل التصنيف الفرعي' : 'إضافة تصنيف فرعي جديد'}
        description="التصنيف الفرعي بيجمع مجموعة محاضرات داخله"
      >
        <form onSubmit={handleBranchSubmit} className="space-y-4">
          <Field label="اسم التصنيف الفرعي">
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
              placeholder="وصف مختصر للتصنيف الفرعي"
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
            label="صورة التصنيف الفرعي"
            value={bImage}
            onChange={setBImage}
            hint="تظهر للطلاب على كارت التصنيف الفرعي."
          />
          <div className="flex justify-start gap-2 pt-2">
            <Button type="submit">
              {editingBranch ? 'حفظ التغييرات' : 'إضافة التصنيف الفرعي'}
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
        title="حذف التصنيف الرئيسي"
        description={`هل أنت متأكد من حذف تصنيف "${deletingStage?.title}"؟ سيتم حذف كل التصنيفات الفرعية والمحاضرات التابعة له. لا يمكن التراجع.`}
      />
      <ConfirmDialog
        open={!!deletingBranch}
        onClose={closeDeleteBranch}
        onConfirm={confirmDeleteBranch}
        title="حذف التصنيف الفرعي"
        description={`هل أنت متأكد من حذف تصنيف "${deletingBranch?.title}"؟ سيتم حذف كل المحاضرات التابعة له. لا يمكن التراجع.`}
      />
    </>
  )
}

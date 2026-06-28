'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowRight,
  Layers,
  GitBranch,
  PlayCircle,
  Pencil,
  Trash2,
  Plus,
  Lock,
  Film,
  GripVertical,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal, Field } from '@/components/ui/modal'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { ImageUploadField } from '@/components/ui/image-upload-field'
import { VideoUploadField } from '@/components/ui/video-upload-field'
import { LectureExamEditor } from '@/components/courses/lecture-exam-editor'
import { cn } from '@/lib/utils'
import {
  type AdminLecture,
  type AdminLesson,
  type AdminExam,
  type BranchOption,
  updateLecture,
  createLesson,
  updateLesson,
  deleteLesson,
} from '@/app/admin/courses/actions'

const textareaClass =
  'w-full resize-none rounded-xl border border-border bg-secondary/60 px-4 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:bg-card'

export function AdminLectureDetail({
  lecture,
  exam,
  branchOptions,
}: {
  lecture: AdminLecture
  exam: AdminExam | null
  branchOptions: BranchOption[]
}) {
  const router = useRouter()

  // ── Lecture edit modal ──
  const [editOpen, setEditOpen] = useState(false)
  const [title, setTitle] = useState(lecture.title)
  const [description, setDescription] = useState(lecture.description)
  const [price, setPrice] = useState(String(lecture.price))
  const [oldPrice, setOldPrice] = useState(
    lecture.oldPrice != null ? String(lecture.oldPrice) : '',
  )
  const [badge, setBadge] = useState(lecture.badge ?? '')
  const [image, setImage] = useState(lecture.image ?? '')

  const handleSaveLecture = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await updateLecture(lecture.id, {
      branchId: lecture.branchId,
      title: title.trim(),
      description: description.trim(),
      price: Number(price) || 0,
      oldPrice: oldPrice ? Number(oldPrice) : null,
      badge: badge.trim() || null,
      image: image || null,
      releaseDate: lecture.releaseDate,
    })
    if (res.error) return toast.error(res.error)
    toast.success('تم تحديث المحاضرة')
    setEditOpen(false)
    router.refresh()
  }

  // ── Lesson modal ──
  const [lessonOpen, setLessonOpen] = useState(false)
  const [editingLesson, setEditingLesson] = useState<AdminLesson | null>(null)
  const [lTitle, setLTitle] = useState('')
  const [lDuration, setLDuration] = useState('')
  const [lIsFree, setLIsFree] = useState(false)
  const [lVideo, setLVideo] = useState('')
  const [lDesc, setLDesc] = useState('')
  const [deletingLesson, setDeletingLesson] = useState<AdminLesson | null>(null)

  const openCreateLesson = () => {
    setEditingLesson(null)
    setLTitle('')
    setLDuration('')
    setLIsFree(false)
    setLVideo('')
    setLDesc('')
    setLessonOpen(true)
  }

  const openEditLesson = (lesson: AdminLesson) => {
    setEditingLesson(lesson)
    setLTitle(lesson.title)
    setLDuration(lesson.duration)
    setLIsFree(lesson.isFree)
    setLVideo(lesson.videoUrl ?? '')
    setLDesc(lesson.description ?? '')
    setLessonOpen(true)
  }

  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!lTitle.trim()) return
    const input = {
      title: lTitle.trim(),
      duration: lDuration.trim(),
      isFree: lIsFree,
      videoUrl: lVideo || null,
      description: lDesc.trim() || null,
    }
    const res = editingLesson
      ? await updateLesson(editingLesson.id, input)
      : await createLesson(lecture.id, input)
    if (res.error) return toast.error(res.error)
    toast.success(editingLesson ? 'تم تحديث الدرس' : 'تمت إضافة الدرس')
    setLessonOpen(false)
    router.refresh()
  }

  const confirmDeleteLesson = async () => {
    if (!deletingLesson) return
    const id = deletingLesson.id
    setDeletingLesson(null)
    const res = await deleteLesson(id)
    if (res.error) return toast.error(res.error)
    toast.success('تم حذف الدرس')
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Link
        href="/admin/courses"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowRight className="size-4" />
        كل المحاضرات
      </Link>

      {/* Lecture header */}
      <Card className="overflow-hidden p-0">
        <div className="flex flex-col gap-5 p-5 sm:flex-row">
          <div className="relative h-40 w-full shrink-0 overflow-hidden rounded-xl border border-border bg-secondary/50 sm:h-44 sm:w-64">
            {lecture.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={lecture.image || '/placeholder.svg'}
                alt={lecture.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground/30">
                <Layers className="size-10" />
              </div>
            )}
          </div>

          <div className="flex flex-1 flex-col">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-foreground text-balance">
                {lecture.title}
              </h1>
              {lecture.badge && (
                <Badge
                  variant="outline"
                  className="border-amber-200 bg-amber-50 font-medium text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400"
                >
                  {lecture.badge}
                </Badge>
              )}
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {lecture.description}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Layers className="size-3.5" />
                {lecture.stageTitle}
              </span>
              <span className="flex items-center gap-1.5">
                <GitBranch className="size-3.5" />
                {lecture.branchTitle}
              </span>
              <span className="flex items-center gap-1.5">
                <PlayCircle className="size-3.5" />
                <span className="font-medium text-foreground">
                  {lecture.lessons.length}
                </span>
                درس
              </span>
              <span className="font-bold text-primary">
                {lecture.price.toLocaleString('en-US')} ج
                {lecture.oldPrice != null && (
                  <span className="mr-1.5 font-normal text-muted-foreground line-through">
                    {lecture.oldPrice.toLocaleString('en-US')}
                  </span>
                )}
              </span>
            </div>

            <div className="mt-auto flex gap-2 pt-4">
              <Button size="sm" onClick={() => setEditOpen(true)}>
                <Pencil className="size-4" />
                تعديل تفاصيل المحاضرة
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Lessons */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">الدروس</h2>
          <Button size="sm" variant="outline" onClick={openCreateLesson}>
            <Plus className="size-4" />
            إضافة درس
          </Button>
        </div>

        {lecture.lessons.length === 0 ? (
          <Card className="py-12 text-center text-sm text-muted-foreground">
            لا توجد دروس في هذه المحاضرة بعد.
          </Card>
        ) : (
          <div className="space-y-2">
            {lecture.lessons.map((lesson, i) => (
              <Card
                key={lesson.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <Link
                  href={`/admin/courses/${lecture.id}/lessons/${lesson.id}`}
                  className="flex flex-1 items-center gap-3"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-sm font-bold text-muted-foreground">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">
                        {lesson.title}
                      </span>
                      {lesson.isFree ? (
                        <Badge
                          variant="outline"
                          className="border-emerald-200 bg-emerald-50 text-[10px] font-medium text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400"
                        >
                          مجاني
                        </Badge>
                      ) : (
                        <Lock className="size-3 text-muted-foreground" />
                      )}
                      {lesson.videoUrl ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-primary">
                          <Film className="size-3" /> فيديو
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-rose-500">
                          بدون فيديو
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {lesson.duration || 'بدون مدة'}
                    </span>
                  </div>
                </Link>

                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-foreground"
                    onClick={() => openEditLesson(lesson)}
                  >
                    <Pencil className="size-4" />
                    <span className="sr-only">تعديل سريع</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                    onClick={() => setDeletingLesson(lesson)}
                  >
                    <Trash2 className="size-4" />
                    <span className="sr-only">حذف الدرس</span>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Exam */}
      <div>
        <h2 className="mb-3 text-lg font-bold text-foreground">اختبار المحاضرة</h2>
        <LectureExamEditor
          lectureId={lecture.id}
          lectureTitle={lecture.title}
          exam={exam}
        />
      </div>

      {/* Lecture edit modal */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="تعديل تفاصيل المحاضرة"
        description="عدّل بيانات المحاضرة الأساسية"
      >
        <form onSubmit={handleSaveLecture} className="space-y-4">
          <Field label="عنوان المحاضرة">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          </Field>
          <Field label="الوصف">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className={textareaClass}
            />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="السعر (ج)">
              <Input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </Field>
            <Field label="السعر قبل الخصم">
              <Input
                type="number"
                value={oldPrice}
                onChange={(e) => setOldPrice(e.target.value)}
                placeholder="اختياري"
              />
            </Field>
            <Field label="شارة (Badge)">
              <Input value={badge} onChange={(e) => setBadge(e.target.value)} />
            </Field>
          </div>
          <ImageUploadField label="صورة المحاضرة" value={image} onChange={setImage} />
          <div className="flex justify-start gap-2 pt-2">
            <Button type="submit">حفظ التغييرات</Button>
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
              إلغاء
            </Button>
          </div>
        </form>
      </Modal>

      {/* Lesson modal */}
      <Modal
        open={lessonOpen}
        onClose={() => setLessonOpen(false)}
        title={editingLesson ? 'تعديل الدرس' : 'إضافة درس جديد'}
        description="حدّد بيانات الدرس وارفع الفيديو الخاص به"
      >
        <form onSubmit={handleSaveLesson} className="space-y-4">
          <Field label="عنوان الدرس">
            <Input
              value={lTitle}
              onChange={(e) => setLTitle(e.target.value)}
              placeholder="مثال: مقدمة عن الموضوع"
              autoFocus
            />
          </Field>
          <Field label="المدة">
            <Input
              value={lDuration}
              onChange={(e) => setLDuration(e.target.value)}
              placeholder="14:30"
              dir="ltr"
            />
          </Field>
          <VideoUploadField
            value={lVideo}
            onChange={setLVideo}
            hint="ارفع ملف الفيديو أو الصق رابطاً مباشراً. هذا ما سيشاهده الطالب."
          />
          <Field label="وصف الدرس">
            <textarea
              value={lDesc}
              onChange={(e) => setLDesc(e.target.value)}
              rows={3}
              placeholder="نبذة عن محتوى الدرس"
              className={textareaClass}
            />
          </Field>
          <label className="flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              checked={lIsFree}
              onChange={(e) => setLIsFree(e.target.checked)}
              className="h-4 w-4 rounded border-border accent-primary"
            />
            <span className="text-sm text-foreground">درس مجاني (متاح للمعاينة)</span>
          </label>
          <div className="flex justify-start gap-2 pt-2">
            <Button type="submit">
              {editingLesson ? 'حفظ التغييرات' : 'إضافة الدرس'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setLessonOpen(false)}>
              إلغاء
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deletingLesson}
        onClose={() => setDeletingLesson(null)}
        onConfirm={confirmDeleteLesson}
        title="حذف الدرس"
        description={`هل أنت متأكد من حذف درس "${deletingLesson?.title}"؟ لا يمكن التراجع.`}
      />
    </div>
  )
}

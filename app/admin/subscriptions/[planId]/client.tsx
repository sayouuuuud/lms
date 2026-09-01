'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { updateSubscriptionPlanAction } from '../actions'

type Scope = { id: string; scope_type: string; scope_id: string | null }
type Plan = {
  id: string; code: string | null; title: string; description: string; marketingLabel: string | null; shortDescription: string
  imageUrl: string | null; price: number; durationDays: number; billingPeriod: string; scopeMode: string
  allowManualAssignment: boolean; isActive: boolean; publicVisible: boolean; featured: boolean; sortOrder: number
  subscriberCount: number; scopes: Scope[]
}
type CourseWithLectures = {
  id: string
  kind: 'monthly_course' | 'course'
  title: string
  branchLabel: string
  lectures: Array<{ id: string; title: string }>
}
type ScopeOption = { id: string; label: string }
type Options = {
  stages: ScopeOption[]
  branches: ScopeOption[]
  terms: ScopeOption[]
  coursesWithLectures: CourseWithLectures[]
  looseLectures: ScopeOption[]
}

const generalScopeGroups: Array<{ type: 'stage' | 'branch' | 'term'; title: string; key: 'stages' | 'branches' | 'terms' }> = [
  { type: 'stage', title: 'المراحل', key: 'stages' },
  { type: 'branch', title: 'الفروع', key: 'branches' },
  { type: 'term', title: 'الترم', key: 'terms' },
]

const scopeTypeLabels: Record<string, string> = {
  stage: 'مرحلة',
  branch: 'فرع',
  term: 'ترم',
  course: 'كورس',
  lecture: 'محاضرة',
}

export default function SubscriptionPlanDetailClient({ initialPlan, options }: { initialPlan: Plan; options: Options }) {
  const [plan, setPlan] = useState(initialPlan)
  const [scopes, setScopes] = useState(initialPlan.scopes)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()
  const [expandedCourseIds, setExpandedCourseIds] = useState<string[]>([])

  function setField<K extends keyof Plan>(field: K, value: Plan[K]) {
    setPlan((current) => ({ ...current, [field]: value }))
  }

  function selectedIds(type: string) {
    return scopes.filter((scope) => scope.scope_type === type).map((scope) => scope.scope_id).filter(Boolean) as string[]
  }

  function hasScope(type: string, id: string) {
    return scopes.some((scope) => scope.scope_type === type && scope.scope_id === id)
  }

  function changeScopes(type: string, values: string[]) {
    setScopes((current) => [
      ...current.filter((scope) => scope.scope_type !== type),
      ...values.map((scopeId) => ({ id: `${type}-${scopeId}`, scope_type: type, scope_id: scopeId })),
    ])
  }

  function removeScope(type: string, id: string) {
    setScopes((current) => current.filter((scope) => !(scope.scope_type === type && scope.scope_id === id)))
  }

  function toggleCourse(course: CourseWithLectures, checked: boolean) {
    setScopes((current) => {
      const lectureIds = new Set(course.lectures.map((lecture) => lecture.id))
      const withoutCourseAndChildren = current.filter((scope) =>
        !(scope.scope_type === 'course' && scope.scope_id === course.id) &&
        !(scope.scope_type === 'lecture' && lectureIds.has(scope.scope_id ?? '')),
      )
      return checked
        ? [...withoutCourseAndChildren, { id: `course-${course.id}`, scope_type: 'course', scope_id: course.id }]
        : withoutCourseAndChildren
    })
  }

  function toggleLecture(course: CourseWithLectures, lectureId: string, checked: boolean) {
    setScopes((current) => {
      const withoutCourse = current.filter((scope) => !(scope.scope_type === 'course' && scope.scope_id === course.id))
      const withoutLecture = withoutCourse.filter((scope) => !(scope.scope_type === 'lecture' && scope.scope_id === lectureId))
      return checked
        ? [...withoutLecture, { id: `lecture-${lectureId}`, scope_type: 'lecture', scope_id: lectureId }]
        : withoutLecture
    })
  }

  function toggleLooseLecture(lectureId: string, checked: boolean) {
    if (checked) {
      setScopes((current) => hasScope('lecture', lectureId) ? current : [...current, { id: `lecture-${lectureId}`, scope_type: 'lecture', scope_id: lectureId }])
    } else {
      removeScope('lecture', lectureId)
    }
  }

  function toggleExpanded(courseId: string) {
    setExpandedCourseIds((current) => current.includes(courseId) ? current.filter((id) => id !== courseId) : [...current, courseId])
  }

  function getScopeLabel(scope: Scope) {
    if (!scope.scope_id) return null
    if (scope.scope_type === 'course') return options.coursesWithLectures.find((course) => course.id === scope.scope_id)?.title
    if (scope.scope_type === 'lecture') {
      const looseLecture = options.looseLectures.find((lecture) => lecture.id === scope.scope_id)
      if (looseLecture) return looseLecture.label
      for (const course of options.coursesWithLectures) {
        const lecture = course.lectures.find((item) => item.id === scope.scope_id)
        if (lecture) return `${course.title} — ${lecture.title}`
      }
    }
    const key = scope.scope_type === 'stage' ? 'stages' : scope.scope_type === 'branch' ? 'branches' : scope.scope_type === 'term' ? 'terms' : null
    return key ? options[key].find((item) => item.id === scope.scope_id)?.label : undefined
  }

  function save(event: React.FormEvent) {
    event.preventDefault()
    setMessage('')
    setError('')
    startTransition(async () => {
      const result = await updateSubscriptionPlanAction(plan.id, {
        title: plan.title,
        code: plan.code ?? undefined,
        description: plan.description,
        marketingLabel: plan.marketingLabel,
        shortDescription: plan.shortDescription,
        imageUrl: plan.imageUrl,
        publicVisible: plan.publicVisible,
        featured: plan.featured,
        sortOrder: plan.sortOrder,
        price: plan.price,
        durationDays: plan.durationDays,
        billingPeriod: plan.billingPeriod,
        scopeMode: plan.scopeMode,
        allowManualAssignment: plan.allowManualAssignment,
        isActive: plan.isActive,
        scopes: plan.scopeMode === 'all_released' ? [] : scopes.map((scope) => ({ scopeType: scope.scope_type, scopeId: scope.scope_id })),
      })
      if (result.ok) setMessage('تم حفظ الخطة وتسجيل التعديل في سجل التدقيق')
      else setError(result.error ?? 'تعذر حفظ الخطة')
    })
  }

  return (
    <div className="space-y-6 p-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/subscriptions" className="text-sm text-primary hover:underline">العودة إلى مدير الاشتراكات</Link>
          <h1 className="mt-2 text-2xl font-bold">إدارة خطة: {initialPlan.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">كل إعدادات هذه الخطة في مكان واحد: كيف تظهر، وما الذي تفتحه، وكيف يديرها الطالب.</p>
        </div>
        <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm">المشتركون الحاليون: <strong>{plan.subscriberCount}</strong></div>
      </div>

      {message && <div className="rounded-lg border border-brand bg-purple-50 px-4 py-3 text-sm text-brand">{message}</div>}
      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      <form onSubmit={save} className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Card><CardHeader><CardTitle>هوية الخطة والعرض للطلاب</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm"><span>اسم الخطة</span><Input value={plan.title} onChange={(e) => setField('title', e.target.value)} required /></label>
            <label className="space-y-1 text-sm"><span>الرمز الداخلي</span><Input value={plan.code ?? ''} onChange={(e) => setField('code', e.target.value || null)} /></label>
            <label className="space-y-1 text-sm sm:col-span-2"><span>الوصف المختصر على الكارت</span><Input value={plan.shortDescription} onChange={(e) => setField('shortDescription', e.target.value)} placeholder="مثال: افتح محتوى أولى ثانوي بالكامل طوال الترم" /></label>
            <label className="space-y-1 text-sm sm:col-span-2"><span>الوصف التفصيلي</span><textarea className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm" value={plan.description} onChange={(e) => setField('description', e.target.value)} /></label>
            <label className="space-y-1 text-sm"><span>شارة تسويقية اختيارية</span><Input value={plan.marketingLabel ?? ''} onChange={(e) => setField('marketingLabel', e.target.value || null)} placeholder="الأفضل للمرحلة" /></label>
            <label className="space-y-1 text-sm"><span>رابط صورة الكارت</span><Input value={plan.imageUrl ?? ''} onChange={(e) => setField('imageUrl', e.target.value || null)} placeholder="https://..." /></label>
            {plan.imageUrl && <div className="overflow-hidden rounded-lg border sm:col-span-2"><img src={plan.imageUrl} alt="صورة الخطة" className="h-40 w-full object-cover" /></div>}
          </CardContent></Card>

          <Card><CardHeader><CardTitle>النطاق والمحتوى المشمول</CardTitle></CardHeader><CardContent className="space-y-4">
            <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={plan.scopeMode} onChange={(e) => setField('scopeMode', e.target.value)}>
              <option value="all_released">كل المحتوى المنشور</option><option value="selected">محتوى محدد بالنطاقات التالية</option>
            </select>
            {plan.scopeMode === 'all_released' ? <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">الخطة تفتح كل المحتوى المنشور. لا تحتاج إلى اختيار عناصر فردية.</div> : <div className="space-y-5">
              <div className="rounded-xl border bg-muted/20 p-4">
                <div className="mb-3"><h3 className="font-semibold">النطاقات العامة</h3><p className="text-xs text-muted-foreground">اختيار مرحلة أو فرع أو ترم يفتح كل المحاضرات المطابقة له.</p></div>
                <div className="grid gap-4 md:grid-cols-3">
                  {generalScopeGroups.map((group) => <div key={group.type} className="space-y-2"><div className="text-sm font-semibold">{group.title}</div><div className="max-h-44 space-y-1 overflow-auto rounded-lg border bg-background p-2">{options[group.key].map((item) => <label key={item.id} className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"><input type="checkbox" checked={hasScope(group.type, item.id)} onChange={(event) => changeScopes(group.type, event.target.checked ? [...selectedIds(group.type), item.id] : selectedIds(group.type).filter((id) => id !== item.id))} className="mt-0.5" /><span>{item.label}</span></label>)}</div></div>)}
                </div>
              </div>

              <div className="rounded-xl border bg-background p-4">
                <div className="mb-3"><h3 className="font-semibold">الكورسات والمحاضرات التابعة لها</h3><p className="text-xs text-muted-foreground">افتح الكورس لاختيار محاضرات محددة، أو اختر الكورس كله. عند اختيار محاضرة محددة يُلغى اختيار الكورس الكامل تلقائيًا.</p></div>
                <div className="space-y-2">{options.coursesWithLectures.map((course) => { const expanded = expandedCourseIds.includes(course.id); const selectedCourse = hasScope('course', course.id); return <div key={`${course.kind}-${course.id}`} className="rounded-lg border p-3">
                  <div className="flex items-start gap-3"><input type="checkbox" checked={selectedCourse} onChange={(event) => toggleCourse(course, event.target.checked)} className="mt-1" /><div className="min-w-0 flex-1"><div className="font-semibold">{course.title}</div><div className="text-xs text-muted-foreground">{course.kind === 'monthly_course' ? 'كورس شهري' : 'كورس عادي'} · {course.branchLabel}{course.kind === 'monthly_course' ? ` · ${course.lectures.length} محاضرة` : ''}</div></div>{course.lectures.length > 0 && <button type="button" onClick={() => toggleExpanded(course.id)} className="rounded-md border px-2.5 py-1 text-xs hover:bg-muted">{expanded ? 'إخفاء المحاضرات' : 'عرض المحاضرات'}</button>}</div>
                  {expanded && course.lectures.length > 0 && <div className="mt-3 space-y-1 border-t pt-3 pr-7">{course.lectures.map((lecture) => <label key={lecture.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"><input type="checkbox" checked={selectedCourse || hasScope('lecture', lecture.id)} disabled={selectedCourse} onChange={(event) => toggleLecture(course, lecture.id, event.target.checked)} /><span>{lecture.title}</span></label>)}</div>}
                </div> })}</div>
                {options.coursesWithLectures.length === 0 && <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">لا توجد كورسات منشورة متاحة للاختيار.</p>}
              </div>

              <div className="rounded-xl border bg-background p-4"><div className="mb-3"><h3 className="font-semibold">محاضرات مستقلة</h3><p className="text-xs text-muted-foreground">هذه محاضرات غير مرتبطة بكورس شهري، ويمكن فتحها منفردة.</p></div><div className="grid gap-1 md:grid-cols-2">{options.looseLectures.map((lecture) => <label key={lecture.id} className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"><input type="checkbox" checked={hasScope('lecture', lecture.id)} onChange={(event) => toggleLooseLecture(lecture.id, event.target.checked)} className="mt-0.5" /><span>{lecture.label}</span></label>)}</div>{options.looseLectures.length === 0 && <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">لا توجد محاضرات مستقلة منشورة.</p>}</div>

              <div className="rounded-xl border border-brand bg-purple-50/60 p-4"><div className="mb-3 flex items-center justify-between gap-3"><div><h3 className="font-semibold text-brand">ملخص المحتوى المختار</h3><p className="text-xs text-brand">هذه هي الصفوف المسطحة التي ستُحفظ للخطة عند الضغط على الحفظ.</p></div><span className="rounded-full bg-brand px-2.5 py-1 text-xs font-semibold text-brand">{scopes.filter((scope) => scope.scope_type !== 'all_released').length} اختيار</span></div><div className="flex flex-wrap gap-2">{scopes.filter((scope) => scope.scope_id).map((scope) => <span key={`${scope.scope_type}-${scope.scope_id}`} className="inline-flex items-center gap-1 rounded-full border border-brand bg-white px-2.5 py-1 text-xs text-brand"><span>{scopeTypeLabels[scope.scope_type] ?? scope.scope_type}: {getScopeLabel(scope) ?? scope.scope_id}</span><button type="button" onClick={() => removeScope(scope.scope_type, scope.scope_id!)} className="font-bold text-brand hover:text-rose-700" aria-label="حذف الاختيار">×</button></span>)}</div>{scopes.filter((scope) => scope.scope_id).length === 0 && <p className="text-sm text-brand">لم يتم اختيار محتوى بعد.</p>}</div>
            </div>}
          </CardContent></Card>
        </div>

        <div className="space-y-6">
          <Card><CardHeader><CardTitle>السعر ودورة الاشتراك</CardTitle></CardHeader><CardContent className="space-y-3">
            <label className="space-y-1 text-sm"><span>السعر بالجنيه</span><Input type="number" min="0" step="0.01" value={plan.price} onChange={(e) => setField('price', Number(e.target.value))} required /></label>
            <label className="space-y-1 text-sm"><span>المدة بالأيام</span><Input type="number" min="1" value={plan.durationDays} onChange={(e) => setField('durationDays', Number(e.target.value))} required /></label>
            <label className="space-y-1 text-sm"><span>نوع الدورة</span><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={plan.billingPeriod} onChange={(e) => setField('billingPeriod', e.target.value)}><option value="month">شهري</option><option value="term">ترم</option><option value="year">سنوي</option><option value="custom">مخصص</option></select></label>
          </CardContent></Card>
          <Card><CardHeader><CardTitle>الظهور والحوكمة</CardTitle></CardHeader><CardContent className="space-y-3 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={plan.publicVisible} onChange={(e) => setField('publicVisible', e.target.checked)} /> تظهر للطلاب في الموقع العام</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={plan.featured} onChange={(e) => setField('featured', e.target.checked)} /> خطة مميزة للصفحة الرئيسية</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={plan.isActive} onChange={(e) => setField('isActive', e.target.checked)} /> الخطة مفعلة وقابلة للاستخدام</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={plan.allowManualAssignment} onChange={(e) => setField('allowManualAssignment', e.target.checked)} /> تسمح بالإسناد اليدوي</label>
            <label className="space-y-1 text-sm"><span>ترتيب الظهور</span><Input type="number" min="0" value={plan.sortOrder} onChange={(e) => setField('sortOrder', Number(e.target.value))} /></label>
          </CardContent></Card>
          <Button type="submit" className="w-full" disabled={pending}>{pending ? 'جارٍ الحفظ...' : 'حفظ إعدادات الخطة'}</Button>
        </div>
      </form>
    </div>
  )
}

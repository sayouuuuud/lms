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
type Options = {
  stages: Array<{ id: string; label: string }>
  branches: Array<{ id: string; label: string }>
  terms: Array<{ id: string; label: string }>
  courses: Array<{ id: string; kind: 'course'; label: string }>
  lectures: Array<{ id: string; kind: 'lecture'; label: string }>
}

const scopeGroups: Array<{ type: string; title: string; key: keyof Options }> = [
  { type: 'stage', title: 'المراحل', key: 'stages' },
  { type: 'branch', title: 'الفروع', key: 'branches' },
  { type: 'term', title: 'الترم', key: 'terms' },
  { type: 'course', title: 'الكورسات', key: 'courses' },
  { type: 'lecture', title: 'المحاضرات', key: 'lectures' },
]

export default function SubscriptionPlanDetailClient({ initialPlan, options }: { initialPlan: Plan; options: Options }) {
  const [plan, setPlan] = useState(initialPlan)
  const [scopes, setScopes] = useState(initialPlan.scopes)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  function setField<K extends keyof Plan>(field: K, value: Plan[K]) {
    setPlan((current) => ({ ...current, [field]: value }))
  }

  function selectedIds(type: string) {
    return scopes.filter((scope) => scope.scope_type === type).map((scope) => scope.scope_id).filter(Boolean) as string[]
  }

  function changeScopes(type: string, values: string[]) {
    setScopes((current) => [
      ...current.filter((scope) => scope.scope_type !== type),
      ...values.map((scopeId) => ({ id: `${type}-${scopeId}`, scope_type: type, scope_id: scopeId })),
    ])
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

      {message && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}
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
            {plan.scopeMode === 'all_released' ? <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">الخطة تفتح كل المحتوى المنشور. لا تحتاج إلى اختيار عناصر فردية.</div> : <div className="grid gap-4 md:grid-cols-2">
              {scopeGroups.map((group) => {
                const items = options[group.key] as Array<{ id: string; label: string }>
                return <label key={group.type} className="space-y-1 text-sm"><span className="font-semibold">{group.title}</span><select multiple className="min-h-36 w-full rounded-md border bg-background p-2 text-sm" value={selectedIds(group.type)} onChange={(e) => changeScopes(group.type, Array.from(e.target.selectedOptions, (option) => option.value))}>{items.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select><span className="text-xs text-muted-foreground">يمكن اختيار أكثر من عنصر باستخدام Ctrl أو Cmd.</span></label>
              })}
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

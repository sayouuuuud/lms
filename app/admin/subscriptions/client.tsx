'use client'

import { useMemo, useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  assignSubscriptionAction,
  createSubscriptionPlanAction,
  getSubscriptionEventsAction,
  getSubscriptionManagerDataAction,
  renewSubscriptionAction,
  setPlanActiveAction,
  setSubscriptionModeAction,
  transitionSubscriptionAction,
  updateSubscriptionPlanAction,
} from './actions'

const STATUS_LABELS: Record<string, string> = {
  active: 'نشط',
  grace: 'فترة سماح',
  expired: 'منتهٍ',
  cancelled: 'ملغى',
  suspended: 'معلّق',
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700',
  grace: 'bg-amber-50 text-amber-700',
  expired: 'bg-slate-100 text-slate-600',
  cancelled: 'bg-rose-50 text-rose-700',
  suspended: 'bg-orange-50 text-orange-700',
}

type Plan = {
  id: string
  code: string | null
  title: string
  description: string
  price: number
  durationDays: number
  billingPeriod: string
  scopeMode: string
  allowManualAssignment: boolean
  isActive: boolean
  archivedAt: string | null
  stageId: string | null
  branchId: string | null
  createdAt: string | null
  subscriberCount: number
  scopes: Array<{ id: string; scopeType: string; scopeId: string | null }>
}

type Subscription = {
  id: string
  status: string
  source: string
  paymentStatus: string
  paymentReference: string | null
  startDate: string | null
  endDate: string | null
  graceUntil: string | null
  cancelledAt: string | null
  cancelReason: string | null
  suspendedAt: string | null
  suspendReason: string | null
  lastPaymentAt: string | null
  nextBillingAt: string | null
  student: { id: string; name: string; code: string | null; email: string | null; phone: string | null } | null
  plan: Plan | null
}

type ManagerData = {
  settings: { mode: string; gracePeriodDays: number }
  stats: { totalPlans: number; activePlans: number; totalSubscriptions: number; uniqueStudents: number; statusCounts: Record<string, number> }
  plans: Plan[]
  subscriptions: Subscription[]
  pagination: { page: number; pageSize: number; total: number; totalPages: number }
}

type Props = { initialData: ManagerData }

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium' }).format(new Date(value))
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 2 }).format(value)
}

function ErrorNotice({ message }: { message: string | null }) {
  if (!message) return null
  return <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{message}</div>
}

export default function SubscriptionsClient({ initialData }: Props) {
  const [data, setData] = useState(initialData)
  const [section, setSection] = useState<'overview' | 'plans' | 'subscribers' | 'settings'>('overview')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [planId, setPlanId] = useState('all')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)
  const [eventsFor, setEventsFor] = useState<string | null>(null)
  const [events, setEvents] = useState<Array<{ id: string; eventType: string; reason: string | null; createdAt: string | null }>>([])

  const [planForm, setPlanForm] = useState({
    title: '', description: '', price: '', durationDays: '30', billingPeriod: 'month', scopeMode: 'all_released', code: '', allowManualAssignment: true, isActive: true,
  })
  const [assignForm, setAssignForm] = useState({ studentId: '', planId: '', startDate: '', endDate: '', paymentStatus: 'waived', paymentReference: '' })

  const activeRate = useMemo(() => data.stats.totalSubscriptions ? Math.round((data.stats.statusCounts.active / data.stats.totalSubscriptions) * 100) : 0, [data.stats])

  function reload(next = {}) {
    startTransition(async () => {
      const result = await getSubscriptionManagerDataAction({ query, status: status as any, planId: planId === 'all' ? undefined : planId, ...next })
      if (result.ok) { setData(result.data); setError(null) } else setError(result.error)
    })
  }

  function showResult(result: { ok: boolean; error?: string }) {
    if (!result.ok) { setError(result.error ?? 'تعذر تنفيذ العملية'); setMessage(null); return false }
    setError(null); setMessage('تم حفظ التغيير وتسجيله في سجل التدقيق'); return true
  }

  function resetPlanForm() {
    setEditingPlan(null)
    setPlanForm({ title: '', description: '', price: '', durationDays: '30', billingPeriod: 'month', scopeMode: 'all_released', code: '', allowManualAssignment: true, isActive: true })
  }

  async function savePlan(event: React.FormEvent) {
    event.preventDefault()
    const input = { title: planForm.title, description: planForm.description, price: Number(planForm.price), durationDays: Number(planForm.durationDays), billingPeriod: planForm.billingPeriod, scopeMode: planForm.scopeMode, allowManualAssignment: planForm.allowManualAssignment, isActive: planForm.isActive, code: planForm.code || undefined, scopes: [] }
    const result = editingPlan ? await updateSubscriptionPlanAction(editingPlan.id, input) : await createSubscriptionPlanAction(input)
    if (showResult(result)) { resetPlanForm(); reload({ page: 1 }) }
  }

  function editPlan(plan: Plan) {
    setEditingPlan(plan)
    setPlanForm({ title: plan.title, description: plan.description, price: String(plan.price), durationDays: String(plan.durationDays), billingPeriod: plan.billingPeriod === 'monthly' ? 'month' : plan.billingPeriod === 'yearly' ? 'year' : plan.billingPeriod, scopeMode: plan.scopeMode, code: plan.code ?? '', allowManualAssignment: plan.allowManualAssignment, isActive: plan.isActive })
    setSection('plans')
  }

  async function togglePlan(plan: Plan) {
    const result = await setPlanActiveAction(plan.id, !plan.isActive)
    if (showResult(result)) reload()
  }

  async function saveSettings(event: React.FormEvent) {
    event.preventDefault()
    const form = event.currentTarget as HTMLFormElement
    const formData = new FormData(form)
    const result = await setSubscriptionModeAction(String(formData.get('mode')), Number(formData.get('gracePeriodDays')))
    if (showResult(result)) reload()
  }

  async function assign(event: React.FormEvent) {
    event.preventDefault()
    const result = await assignSubscriptionAction({ studentId: assignForm.studentId, planId: assignForm.planId, startDate: assignForm.startDate || undefined, endDate: assignForm.endDate || undefined, paymentStatus: assignForm.paymentStatus, paymentReference: assignForm.paymentReference || null })
    if (showResult(result)) { setAssignForm({ studentId: '', planId: '', startDate: '', endDate: '', paymentStatus: 'waived', paymentReference: '' }); reload({ page: 1 }); setSection('subscribers') }
  }

  async function changeStatus(subscription: Subscription, toStatus: 'active' | 'grace' | 'suspended' | 'cancelled' | 'expired') {
    const reason = window.prompt('سبب تغيير حالة الاشتراك (اختياري):') ?? ''
    const result = await transitionSubscriptionAction({ subscriptionId: subscription.id, toStatus, reason })
    if (showResult(result)) reload()
  }

  function renew(subscription: Subscription) {
    const duration = window.prompt('مدة التجديد بالأيام', '30') ?? ''
    const durationDays = Number(duration)
    if (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > 3650) {
      setError('أدخل مدة تجديد صحيحة بين يوم و3650 يومًا')
      return
    }
    const reason = window.prompt('سبب التجديد أو مرجع الموافقة') ?? ''
    if (!reason.trim()) return
    startTransition(async () => {
      const result = await renewSubscriptionAction({ subscriptionId: subscription.id, durationDays, reason })
      if (showResult(result)) reload()
    })
  }

  async function showEvents(subscriptionId: string) {
    const result = await getSubscriptionEventsAction(subscriptionId)
    if (result.ok) { setEventsFor(subscriptionId); setEvents(result.events); setError(null) } else setError(result.error)
  }

  return (
    <div className="space-y-6" dir="rtl">
      <ErrorNotice message={error} />
      {message && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ['إجمالي الخطط', data.stats.totalPlans, 'خطة معرفة'],
          ['الخطط النشطة', data.stats.activePlans, 'متاحة للبيع'],
          ['الاشتراكات', data.stats.totalSubscriptions, `${activeRate}% نشطة`],
          ['الطلاب المشتركين', data.stats.uniqueStudents, 'طلاب فريدون'],
        ].map(([label, value, hint]) => <Card key={String(label)}><CardContent className="p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p><p className="text-xs text-muted-foreground">{hint}</p></CardContent></Card>)}
      </div>

      <Card className="border-slate-200 bg-slate-50/60"><CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between"><div><p className="text-sm font-semibold">قرار الوصول الحالي</p><p className="text-sm text-muted-foreground">المشتريات الفردية لا تتأثر بانتهاء الاشتراك. الاشتراك يضيف وصولًا مؤقتًا فقط.</p></div><div className="rounded-full bg-white px-4 py-2 text-sm font-bold shadow-sm">{data.settings.mode === 'hybrid' ? 'شراء + اشتراكات' : data.settings.mode === 'subscriptions_only' ? 'اشتراكات فقط' : 'شراء فردي فقط'}</div></CardContent></Card>

      <div className="flex flex-wrap gap-2 border-b pb-2">
        {[['overview', 'نظرة تشغيلية'], ['plans', 'الخطط والنطاقات'], ['subscribers', 'المشتركون والوصول'], ['settings', 'الإعدادات والحوكمة']].map(([key, label]) => <Button key={key} variant={section === key ? 'default' : 'ghost'} onClick={() => setSection(key as any)}>{label}</Button>)}
      </div>

      {section === 'overview' && <div className="grid gap-6 lg:grid-cols-2">
        <Card><CardHeader><CardTitle>توزيع الحالات</CardTitle></CardHeader><CardContent className="space-y-3">{Object.entries(data.stats.statusCounts).map(([key, count]) => <div key={key} className="flex items-center justify-between rounded-lg border bg-white p-3"><span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[key] ?? 'bg-slate-100'}`}>{STATUS_LABELS[key] ?? key}</span><span className="font-bold">{count}</span></div>)}</CardContent></Card>
        <Card><CardHeader><CardTitle>ضوابط التشغيل</CardTitle></CardHeader><CardContent className="space-y-3 text-sm text-muted-foreground"><p>• الوصول المملوك بالشراء مستقل ولا يُلغى بانتهاء الاشتراك.</p><p>• الاشتراك المنتهي أو الملغى لا يمنح وصولًا جديدًا، مع احترام فترة السماح المحددة.</p><p>• كل إنشاء أو تعديل أو انتقال حالة يُسجل في سجل التدقيق وسجل أحداث الاشتراك.</p><p>• يمكن تشغيل الشراء فقط أو الاشتراكات فقط أو الجمع بينهما حسب إعداد المدرس.</p></CardContent></Card>
      </div>}

      {section === 'plans' && <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <Card><CardHeader><CardTitle>{editingPlan ? 'تعديل خطة' : 'إنشاء خطة اشتراك'}</CardTitle></CardHeader><CardContent><form onSubmit={savePlan} className="space-y-3"><Input placeholder="اسم الخطة" value={planForm.title} onChange={e => setPlanForm({ ...planForm, title: e.target.value })} required /><Input placeholder="رمز داخلي اختياري" value={planForm.code} onChange={e => setPlanForm({ ...planForm, code: e.target.value })} /><Input placeholder="وصف الخطة" value={planForm.description} onChange={e => setPlanForm({ ...planForm, description: e.target.value })} /><div className="grid grid-cols-2 gap-2"><Input type="number" min="0" step="0.01" placeholder="السعر بالجنيه" value={planForm.price} onChange={e => setPlanForm({ ...planForm, price: e.target.value })} required /><Input type="number" min="1" placeholder="المدة بالأيام" value={planForm.durationDays} onChange={e => setPlanForm({ ...planForm, durationDays: e.target.value })} required /></div><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={planForm.billingPeriod} onChange={e => setPlanForm({ ...planForm, billingPeriod: e.target.value })}><option value="month">شهري</option><option value="term">ترم</option><option value="year">سنوي</option><option value="custom">مخصص</option></select><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={planForm.scopeMode} onChange={e => setPlanForm({ ...planForm, scopeMode: e.target.value })}><option value="all_released">كل المحتوى المنشور</option><option value="selected">نطاق محدد</option></select><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={planForm.allowManualAssignment} onChange={e => setPlanForm({ ...planForm, allowManualAssignment: e.target.checked })} /> تسمح بالإسناد اليدوي</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={planForm.isActive} onChange={e => setPlanForm({ ...planForm, isActive: e.target.checked })} /> خطة نشطة</label><div className="flex gap-2"><Button type="submit" disabled={isPending}>{editingPlan ? 'حفظ التعديل' : 'إنشاء الخطة'}</Button>{editingPlan && <Button type="button" variant="outline" onClick={resetPlanForm}>إلغاء</Button>}</div></form></CardContent></Card>
        <Card><CardHeader><CardTitle>كل الخطط والنطاقات</CardTitle></CardHeader><CardContent><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>الخطة</TableHead><TableHead>السعر والدورة</TableHead><TableHead>المشتركون</TableHead><TableHead>النطاق</TableHead><TableHead>الحالة</TableHead><TableHead>إجراءات</TableHead></TableRow></TableHeader><TableBody>{data.plans.length ? data.plans.map(plan => <TableRow key={plan.id}><TableCell><div className="font-semibold">{plan.title}</div><div className="text-xs text-muted-foreground">{plan.code ?? 'بدون رمز'} · {plan.description || 'بدون وصف'}</div></TableCell><TableCell>{formatMoney(plan.price)}<div className="text-xs text-muted-foreground">{plan.durationDays} يوم · {plan.billingPeriod}</div></TableCell><TableCell>{plan.subscriberCount}</TableCell><TableCell>{plan.scopeMode === 'all_released' ? 'كل المنشور' : 'محدد'}</TableCell><TableCell><span className={`rounded-full px-2 py-1 text-xs ${plan.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{plan.isActive ? 'نشطة' : 'مؤرشفة'}</span></TableCell><TableCell><div className="flex gap-1"><Button size="sm" variant="outline" onClick={() => editPlan(plan)}>تعديل</Button><Button size="sm" variant={plan.isActive ? 'destructive' : 'secondary'} onClick={() => togglePlan(plan)}>{plan.isActive ? 'أرشفة' : 'تفعيل'}</Button></div></TableCell></TableRow>) : <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">لا توجد خطط بعد</TableCell></TableRow>}</TableBody></Table></div></CardContent></Card>
      </div>}

      {section === 'subscribers' && <div className="space-y-6">
        <Card><CardHeader><CardTitle>إسناد اشتراك لطالب</CardTitle></CardHeader><CardContent><form onSubmit={assign} className="grid gap-3 md:grid-cols-6"><Input className="md:col-span-2" placeholder="معرّف الطالب" value={assignForm.studentId} onChange={e => setAssignForm({ ...assignForm, studentId: e.target.value })} required /><select className="h-10 rounded-md border bg-background px-3 text-sm" value={assignForm.planId} onChange={e => setAssignForm({ ...assignForm, planId: e.target.value })} required><option value="">اختر الخطة</option>{data.plans.filter(p => p.isActive && p.allowManualAssignment).map(p => <option key={p.id} value={p.id}>{p.title}</option>)}</select><Input type="date" value={assignForm.startDate} onChange={e => setAssignForm({ ...assignForm, startDate: e.target.value })} /><Input type="date" value={assignForm.endDate} onChange={e => setAssignForm({ ...assignForm, endDate: e.target.value })} /><select className="h-10 rounded-md border bg-background px-3 text-sm" value={assignForm.paymentStatus} onChange={e => setAssignForm({ ...assignForm, paymentStatus: e.target.value })}><option value="waived">معفى/يدوي</option><option value="paid">مدفوع</option><option value="pending">معلق</option></select><Button type="submit" disabled={isPending}>إسناد آمن</Button><Input className="md:col-span-2" placeholder="مرجع الدفع اختياري" value={assignForm.paymentReference} onChange={e => setAssignForm({ ...assignForm, paymentReference: e.target.value })} /></form></CardContent></Card>
        <Card><CardHeader><CardTitle>سجل المشتركين</CardTitle></CardHeader><CardContent><div className="mb-4 grid gap-2 md:grid-cols-[1fr_180px_180px_auto]"><Input placeholder="بحث بالاسم أو الكود أو الهاتف أو البريد أو الخطة" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && reload({ page: 1 })} /><select className="h-10 rounded-md border bg-background px-3 text-sm" value={status} onChange={e => { setStatus(e.target.value); reload({ status: e.target.value as any, page: 1 }) }}><option value="all">كل الحالات</option>{Object.entries(STATUS_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><select className="h-10 rounded-md border bg-background px-3 text-sm" value={planId} onChange={e => { setPlanId(e.target.value); reload({ planId: e.target.value === 'all' ? undefined : e.target.value, page: 1 }) }}><option value="all">كل الخطط</option>{data.plans.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}</select><Button onClick={() => reload({ page: 1 })} disabled={isPending}>تحديث</Button></div><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>الطالب</TableHead><TableHead>الخطة</TableHead><TableHead>الفترة</TableHead><TableHead>الدفع</TableHead><TableHead>الحالة</TableHead><TableHead>حوكمة</TableHead></TableRow></TableHeader><TableBody>{data.subscriptions.length ? data.subscriptions.map(subscription => <TableRow key={subscription.id}><TableCell><div className="font-semibold">{subscription.student?.name ?? 'طالب غير معروف'}</div><div className="text-xs text-muted-foreground">{subscription.student?.code ?? subscription.student?.phone ?? subscription.student?.email ?? 'بدون بيانات اتصال'}</div></TableCell><TableCell>{subscription.plan?.title ?? 'خطة محذوفة'}<div className="text-xs text-muted-foreground">{subscription.source}</div></TableCell><TableCell>{formatDate(subscription.startDate)} — {formatDate(subscription.endDate)}<div className="text-xs text-muted-foreground">السماح حتى {formatDate(subscription.graceUntil)}</div></TableCell><TableCell>{subscription.paymentStatus}<div className="text-xs text-muted-foreground">{subscription.paymentReference ?? 'بدون مرجع'}</div></TableCell><TableCell><span className={`rounded-full px-2 py-1 text-xs ${STATUS_STYLES[subscription.status] ?? 'bg-slate-100'}`}>{STATUS_LABELS[subscription.status] ?? subscription.status}</span></TableCell><TableCell><div className="flex flex-wrap gap-1"><Button size="sm" variant="outline" onClick={() => showEvents(subscription.id)}>الأحداث</Button>{!['cancelled'].includes(subscription.status) && <Button size="sm" variant="secondary" onClick={() => renew(subscription)}>تجديد</Button>}{['grace', 'suspended'].includes(subscription.status) && <Button size="sm" variant="secondary" onClick={() => changeStatus(subscription, 'active')}>استئناف</Button>}{subscription.status === 'active' && <><Button size="sm" variant="outline" onClick={() => changeStatus(subscription, 'grace')}>سماح</Button><Button size="sm" variant="destructive" onClick={() => changeStatus(subscription, 'suspended')}>تعليق</Button></>}{!['cancelled', 'expired'].includes(subscription.status) && <Button size="sm" variant="destructive" onClick={() => changeStatus(subscription, 'cancelled')}>إلغاء</Button>}</div></TableCell></TableRow>) : <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">لا توجد اشتراكات مطابقة</TableCell></TableRow>}</TableBody></Table></div><div className="mt-4 flex items-center justify-between text-sm text-muted-foreground"><span>إجمالي النتائج: {data.pagination.total}</span><span>صفحة {data.pagination.page} من {data.pagination.totalPages}</span></div></CardContent></Card>
        {eventsFor && <Card><CardHeader><CardTitle>سجل أحداث الاشتراك</CardTitle></CardHeader><CardContent><div className="space-y-2">{events.length ? events.map(event => <div key={event.id} className="flex justify-between rounded border p-3 text-sm"><span>{event.eventType} {event.reason ? `— ${event.reason}` : ''}</span><span className="text-muted-foreground">{formatDate(event.createdAt)}</span></div>) : <p className="text-sm text-muted-foreground">لا توجد أحداث مسجلة.</p>}</div></CardContent></Card>}
      </div>}

      {section === 'settings' && <div className="grid gap-6 lg:grid-cols-2"><Card><CardHeader><CardTitle>وضع البيع والوصول</CardTitle></CardHeader><CardContent><form onSubmit={saveSettings} className="space-y-4"><select name="mode" defaultValue={data.settings.mode} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="purchases_only">شراء فردي فقط</option><option value="subscriptions_only">اشتراكات فقط</option><option value="hybrid">شراء فردي + اشتراكات</option></select><div><label className="mb-1 block text-sm font-medium">فترة السماح بعد الاستحقاق بالأيام</label><Input name="gracePeriodDays" type="number" min="0" max="90" defaultValue={data.settings.gracePeriodDays} /></div><Button type="submit" disabled={isPending}>حفظ الإعدادات</Button></form></CardContent></Card><Card><CardHeader><CardTitle>ملاحظات الحوكمة</CardTitle></CardHeader><CardContent className="space-y-3 text-sm text-muted-foreground"><p>تغيير الوضع يؤثر على منح الوصول الجديد فقط، ولا يحذف مشتريات الطلاب السابقة.</p><p>إيقاف خطة يمنع الاشتراكات الجديدة والإسناد اليدوي، ولا يلغي تلقائيًا سجلات الاشتراكات القائمة.</p><p>الإلغاء والتعليق انتقالات صريحة تُسجل بالفاعل والسبب ووقت التنفيذ.</p><p>تأكد من مراجعة مرجع الدفع قبل الإسناد اليدوي للطلاب.</p></CardContent></Card></div>}
    </div>
  )
}

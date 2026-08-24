'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  approveSubscriptionRequestAction,
  assignSubscriptionAction,
  createSubscriptionPlanAction,
  getSubscriptionDetailAction,
  getSubscriptionManagerDataAction,
  listSubscriptionRequestsAction,
  rejectSubscriptionRequestAction,
  renewSubscriptionAction,
  searchStudentsAction,
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
  marketingLabel: string | null
  shortDescription: string
  imageUrl: string | null
  publicVisible: boolean
  featured: boolean
  sortOrder: number
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
  computedStatus?: 'active' | 'grace' | 'expired'
  graceDaysLeft?: number | null
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

type StudentHit = { id: string; name: string; code: string | null; phone: string | null }

type DetailEvent = {
  id: string
  eventType: string
  actorName: string
  fromStatus: string | null
  toStatus: string | null
  reason: string | null
  paymentReference: string | null
  metadata: unknown
  createdAt: string
}

type DetailPayload = {
  id: string
  rawStatus: string
  computedStatus: 'active' | 'grace' | 'expired'
  source: string
  paymentStatus: string
  paymentReference: string | null
  startDate: string | null
  endDate: string | null
  graceUntil: string | null
  graceDaysLeft: number | null
  cancelledAt: string | null
  cancelReason: string | null
  suspendedAt: string | null
  suspendReason: string | null
  lastPaymentAt: string | null
  nextBillingAt: string | null
  planSnapshot: unknown
  student: { id: string; name: string; code: string | null; email: string | null; phone: string | null } | null
  plan: { id: string; title: string; price: number; durationDays: number; scopeMode: string; isActive: boolean; scopes: Array<{ scopeType: string; scopeId: string | null }> } | null
  events: DetailEvent[]
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  created: 'إسناد / إنشاء',
  renewed: 'تجديد',
  payment_recorded: 'تسجيل دفعة',
  grace_started: 'بدء فترة سماح',
  expired: 'انتهاء',
  cancelled: 'إلغاء',
  suspended: 'تعليق',
  resumed: 'استئناف',
  updated: 'تحديث',
}

type ManagerData = {
  settings: { mode: string; gracePeriodDays: number }
  stats: { totalPlans: number; activePlans: number; totalSubscriptions: number; uniqueStudents: number; statusCounts: Record<string, number> }
  plans: Plan[]
  subscriptions: Subscription[]
  pagination: { page: number; pageSize: number; total: number; totalPages: number }
}

type RequestRow = {
  id: string
  code: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  studentName: string
  studentContact: string
  planId: string
  planTitle: string
  snapshotPrice: number | null
  receiptUrl: string | null
  paymentMethod: string | null
  reference: string | null
  studentNote: string | null
  adminNote: string | null
  createdAt: string
  reviewedAt: string | null
}

const REQUEST_STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700',
  approved: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-rose-50 text-rose-700',
  cancelled: 'bg-slate-100 text-slate-600',
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
  const [section, setSection] = useState<'overview' | 'requests' | 'plans' | 'subscribers' | 'settings'>('overview')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [planId, setPlanId] = useState('all')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)
  const [detailFor, setDetailFor] = useState<string | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detail, setDetail] = useState<DetailPayload | null>(null)
  const [studentQuery, setStudentQuery] = useState('')
  const [studentResults, setStudentResults] = useState<StudentHit[]>([])
  const [studentPicked, setStudentPicked] = useState<StudentHit | null>(null)
  const [requests, setRequests] = useState<RequestRow[] | null>(null)
  const [requestsLoading, setRequestsLoading] = useState(false)

  const [planForm, setPlanForm] = useState({
    title: '', description: '', marketingLabel: '', shortDescription: '', imageUrl: '', publicVisible: true, featured: false, sortOrder: 0, price: '', durationDays: '30', billingPeriod: 'month', scopeMode: 'all_released', code: '', allowManualAssignment: true, isActive: true,
  })
  const [assignForm, setAssignForm] = useState({ studentId: '', planId: '', startDate: '', endDate: '', paymentStatus: 'waived', paymentReference: '' })

  const activeRate = useMemo(() => data.stats.totalSubscriptions ? Math.round((data.stats.statusCounts.active / data.stats.totalSubscriptions) * 100) : 0, [data.stats])

  // شارة طلبات الاشتراك: عدد المعلّق + عدّاد المتأخر (>48 ساعة دون مراجعة).
  const requestsLabel = useMemo(() => {
    if (!requests) return 'طلبات الاشتراك'
    const pending = requests.filter(r => r.status === 'pending')
    const staleCutoff = Date.now() - 48 * 60 * 60 * 1000
    const stale = pending.filter(r => new Date(r.createdAt).getTime() < staleCutoff).length
    let label = 'طلبات الاشتراك'
    if (pending.length) label += ` (${pending.length})`
    if (stale) label += ` · ${stale} متأخر`
    return label
  }, [requests])

  // بحث الطلاب للإسناد — استدعاء مؤجّل عبر الإجراء المحمي searchStudentsAction
  useEffect(() => {
    if (studentPicked || studentQuery.trim().length < 1) { setStudentResults([]); return }
    const timer = setTimeout(async () => {
      const result = await searchStudentsAction(studentQuery.trim())
      if (result.ok) setStudentResults(result.students)
    }, 350)
    return () => clearTimeout(timer)
  }, [studentQuery, studentPicked])

  async function openDetail(subscriptionId: string) {
    setDetailFor(subscriptionId)
    setDetail(null)
    setDetailLoading(true)
    setError(null)
    const result = await getSubscriptionDetailAction(subscriptionId)
    setDetailLoading(false)
    if (result.ok) setDetail(result.detail)
    else setError(result.error ?? 'تعذر جلب تفاصيل الاشتراك')
  }

  async function loadRequests() {
    setRequestsLoading(true)
    const result = await listSubscriptionRequestsAction()
    setRequestsLoading(false)
    if (result.ok) setRequests(result.requests)
    else setError(result.error ?? 'تعذر جلب الطلبات')
  }

  useEffect(() => {
    if (section === 'requests' && requests === null && !requestsLoading) loadRequests()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section])

  async function approveRequest(request: RequestRow) {
    if (!window.confirm(`اعتماد الطلب ${request.code} لـ ${request.studentName}؟ سيُنشأ/يُجدد الاشتراك ويُسجل الدفع.`)) return
    startTransition(async () => {
      const result = await approveSubscriptionRequestAction(request.id)
      if (showResult(result)) {
        setMessage(result.noop ? 'الطلب معتمد مسبقًا.' : `تم اعتماد الطلب وإنشاء/تجديد الاشتراك (${request.planTitle}).`)
        loadRequests()
        reload()
      }
    })
  }

  async function rejectRequest(request: RequestRow) {
    const note = window.prompt('سبب الرفض (سيظهر للطالب):') ?? ''
    if (!note.trim()) { setError('سبب الرفض مطلوب'); return }
    startTransition(async () => {
      const result = await rejectSubscriptionRequestAction(request.id, note)
      if (showResult(result)) { loadRequests() }
    })
  }

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
    setPlanForm({ title: '', description: '', marketingLabel: '', shortDescription: '', imageUrl: '', publicVisible: true, featured: false, sortOrder: 0, price: '', durationDays: '30', billingPeriod: 'month', scopeMode: 'all_released', code: '', allowManualAssignment: true, isActive: true })
  }

  async function savePlan(event: React.FormEvent) {
    event.preventDefault()
    const input = { title: planForm.title, description: planForm.description, marketingLabel: planForm.marketingLabel || null, shortDescription: planForm.shortDescription, imageUrl: planForm.imageUrl || null, publicVisible: planForm.publicVisible, featured: planForm.featured, sortOrder: Number(planForm.sortOrder), price: Number(planForm.price), durationDays: Number(planForm.durationDays), billingPeriod: planForm.billingPeriod, scopeMode: planForm.scopeMode, allowManualAssignment: planForm.allowManualAssignment, isActive: planForm.isActive, code: planForm.code || undefined, scopes: [] }
    const result = editingPlan ? await updateSubscriptionPlanAction(editingPlan.id, input) : await createSubscriptionPlanAction(input)
    if (showResult(result)) { resetPlanForm(); reload({ page: 1 }) }
  }

  function editPlan(plan: Plan) {
    setEditingPlan(plan)
    setPlanForm({ title: plan.title, description: plan.description, marketingLabel: plan.marketingLabel ?? '', shortDescription: plan.shortDescription ?? '', imageUrl: plan.imageUrl ?? '', publicVisible: plan.publicVisible, featured: plan.featured, sortOrder: plan.sortOrder, price: String(plan.price), durationDays: String(plan.durationDays), billingPeriod: plan.billingPeriod === 'monthly' ? 'month' : plan.billingPeriod === 'yearly' ? 'year' : plan.billingPeriod, scopeMode: plan.scopeMode, code: plan.code ?? '', allowManualAssignment: plan.allowManualAssignment, isActive: plan.isActive })
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
    if (showResult(result)) {
      setAssignForm({ studentId: '', planId: '', startDate: '', endDate: '', paymentStatus: 'waived', paymentReference: '' })
      setStudentPicked(null)
      setStudentQuery('')
      reload({ page: 1 })
      setSection('subscribers')
    }
  }

  async function changeStatus(subscription: Subscription, toStatus: 'active' | 'grace' | 'suspended' | 'cancelled' | 'expired') {
    const reason = window.prompt('سبب تغيير حالة الاشتراك (اختياري):') ?? ''
    const result = await transitionSubscriptionAction({ subscriptionId: subscription.id, toStatus, reason })
    if (showResult(result)) { reload(); if (detailFor === subscription.id) openDetail(subscription.id) }
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
      if (showResult(result)) { reload(); if (detailFor === subscription.id) openDetail(subscription.id) }
    })
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
        {[['overview', 'نظرة تشغيلية'], ['requests', requestsLabel], ['plans', 'الخطط والنطاقات'], ['subscribers', 'المشتركون والوصول'], ['settings', 'الإعدادات والحوكمة']].map(([key, label]) => <Button key={key} variant={section === key ? 'default' : 'ghost'} onClick={() => setSection(key as any)}>{label}</Button>)}
      </div>

      {section === 'requests' && <Card><CardHeader><CardTitle>طلبات الاشتراك</CardTitle></CardHeader><CardContent><div className="mb-3 flex justify-end"><Button variant="outline" size="sm" onClick={loadRequests} disabled={requestsLoading}>تحديث</Button></div>{requestsLoading && !requests ? <p className="text-sm text-muted-foreground">جارٍ التحميل…</p> : requests && requests.length ? <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>الطلب</TableHead><TableHead>الطالب</TableHead><TableHead>الخطة</TableHead><TableHead>الدفع</TableHead><TableHead>الحالة</TableHead><TableHead>إجراءات</TableHead></TableRow></TableHeader><TableBody>{requests.map(request => <TableRow key={request.id}><TableCell><div className="font-mono text-xs">{request.code}</div><div className="text-xs text-muted-foreground">{formatDate(request.createdAt)}</div></TableCell><TableCell><div className="font-semibold">{request.studentName || '—'}</div><div className="text-xs text-muted-foreground">{request.studentContact}</div>{request.studentNote && <div className="mt-1 max-w-48 text-xs text-muted-foreground">ملاحظة: {request.studentNote}</div>}</TableCell><TableCell>{request.planTitle}<div className="text-xs text-muted-foreground">{request.snapshotPrice != null ? `${formatMoney(request.snapshotPrice)} من لقطة الطلب` : ''}</div></TableCell><TableCell><div>{request.paymentMethod ?? '—'}</div><div className="text-xs text-muted-foreground">{request.reference ?? 'بدون مرجع'}</div>{request.receiptUrl && <a href={request.receiptUrl} target="_blank" rel="noreferrer" className="text-xs font-medium text-primary underline">عرض الإيصال</a>}</TableCell><TableCell><span className={`rounded-full px-2 py-1 text-xs ${REQUEST_STATUS_STYLES[request.status] ?? 'bg-slate-100'}`}>{({ pending: 'قيد المراجعة', approved: 'معتمد', rejected: 'مرفوض', cancelled: 'ملغى' } as Record<string, string>)[request.status] ?? request.status}</span></TableCell><TableCell><div className="flex gap-1">{request.status === 'pending' && <><Button size="sm" disabled={isPending} onClick={() => approveRequest(request)}>اعتماد</Button><Button size="sm" variant="destructive" disabled={isPending} onClick={() => rejectRequest(request)}>رفض</Button></>}{request.status !== 'pending' && <span className="text-xs text-muted-foreground">{request.reviewedAt ? `رُوجع في ${formatDate(request.reviewedAt)}` : ''}{request.adminNote ? ` — ${request.adminNote}` : ''}</span>}</div></TableCell></TableRow>)}</TableBody></Table></div> : <p className="py-6 text-center text-sm text-muted-foreground">لا توجد طلبات اشتراك بعد.</p>}</CardContent></Card>}

      {section === 'overview' && <div className="grid gap-6 lg:grid-cols-2">
        <Card><CardHeader><CardTitle>توزيع الحالات</CardTitle></CardHeader><CardContent className="space-y-3">{Object.entries(data.stats.statusCounts).map(([key, count]) => <div key={key} className="flex items-center justify-between rounded-lg border bg-white p-3"><span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[key] ?? 'bg-slate-100'}`}>{STATUS_LABELS[key] ?? key}</span><span className="font-bold">{count}</span></div>)}</CardContent></Card>
        <Card><CardHeader><CardTitle>ضوابط التشغيل</CardTitle></CardHeader><CardContent className="space-y-3 text-sm text-muted-foreground"><p>• الوصول المملوك بالشراء مستقل ولا يُلغى بانتهاء الاشتراك.</p><p>• الاشتراك المنتهي أو الملغى لا يمنح وصولًا جديدًا، مع احترام فترة السماح المحددة.</p><p>• كل إنشاء أو تعديل أو انتقال حالة يُسجل في سجل التدقيق وسجل أحداث الاشتراك.</p><p>• يمكن تشغيل الشراء فقط أو الاشتراكات فقط أو الجمع بينهما حسب إعداد المدرس.</p></CardContent></Card>
      </div>}

      {section === 'plans' && <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <Card><CardHeader><CardTitle>{editingPlan ? 'تعديل خطة' : 'إنشاء خطة اشتراك'}</CardTitle></CardHeader><CardContent><form onSubmit={savePlan} className="space-y-3"><Input placeholder="اسم الخطة" value={planForm.title} onChange={e => setPlanForm({ ...planForm, title: e.target.value })} required /><Input placeholder="رمز داخلي اختياري" value={planForm.code} onChange={e => setPlanForm({ ...planForm, code: e.target.value })} /><Input placeholder="وصف الخطة" value={planForm.description} onChange={e => setPlanForm({ ...planForm, description: e.target.value })} /><Input placeholder="وصف مختصر للكارت" value={planForm.shortDescription} onChange={e => setPlanForm({ ...planForm, shortDescription: e.target.value })} /><Input placeholder="شارة تسويقية اختيارية" value={planForm.marketingLabel} onChange={e => setPlanForm({ ...planForm, marketingLabel: e.target.value })} /><Input placeholder="رابط صورة الكارت" value={planForm.imageUrl} onChange={e => setPlanForm({ ...planForm, imageUrl: e.target.value })} /><div className="grid grid-cols-2 gap-2"><Input type="number" min="0" step="0.01" placeholder="السعر بالجنيه" value={planForm.price} onChange={e => setPlanForm({ ...planForm, price: e.target.value })} required /><Input type="number" min="1" placeholder="المدة بالأيام" value={planForm.durationDays} onChange={e => setPlanForm({ ...planForm, durationDays: e.target.value })} required /></div><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={planForm.billingPeriod} onChange={e => setPlanForm({ ...planForm, billingPeriod: e.target.value })}><option value="month">شهري</option><option value="term">ترم</option><option value="year">سنوي</option><option value="custom">مخصص</option></select><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={planForm.scopeMode} onChange={e => setPlanForm({ ...planForm, scopeMode: e.target.value })}><option value="all_released">كل المحتوى المنشور</option><option value="selected">نطاق محدد</option></select><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={planForm.publicVisible} onChange={e => setPlanForm({ ...planForm, publicVisible: e.target.checked })} /> تظهر للطلاب</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={planForm.featured} onChange={e => setPlanForm({ ...planForm, featured: e.target.checked })} /> مميزة في الصفحة الرئيسية</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={planForm.allowManualAssignment} onChange={e => setPlanForm({ ...planForm, allowManualAssignment: e.target.checked })} /> تسمح بالإسناد اليدوي</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={planForm.isActive} onChange={e => setPlanForm({ ...planForm, isActive: e.target.checked })} /> خطة نشطة</label><div className="flex gap-2"><Button type="submit" disabled={isPending}>{editingPlan ? 'حفظ التعديل' : 'إنشاء الخطة'}</Button>{editingPlan && <Button type="button" variant="outline" onClick={resetPlanForm}>إلغاء</Button>}</div></form></CardContent></Card>
        <Card><CardHeader><CardTitle>كل الخطط والنطاقات</CardTitle></CardHeader><CardContent><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>الخطة</TableHead><TableHead>السعر والدورة</TableHead><TableHead>المشتركون</TableHead><TableHead>النطاق</TableHead><TableHead>الحالة</TableHead><TableHead>إجراءات</TableHead></TableRow></TableHeader><TableBody>{data.plans.length ? data.plans.map(plan => <TableRow key={plan.id}><TableCell><div className="font-semibold">{plan.title}</div><div className="text-xs text-muted-foreground">{plan.code ?? 'بدون رمز'} · {plan.description || 'بدون وصف'}</div></TableCell><TableCell>{formatMoney(plan.price)}<div className="text-xs text-muted-foreground">{plan.durationDays} يوم · {plan.billingPeriod}</div></TableCell><TableCell>{plan.subscriberCount}</TableCell><TableCell>{plan.scopeMode === 'all_released' ? 'كل المنشور' : 'محدد'}</TableCell><TableCell><span className={`rounded-full px-2 py-1 text-xs ${plan.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{plan.isActive ? 'نشطة' : 'مؤرشفة'}</span></TableCell><TableCell><div className="flex gap-1"><Link href={`/admin/subscriptions/${plan.id}`}><Button size="sm" variant="secondary">إدارة تفصيلية</Button></Link><Button size="sm" variant="outline" onClick={() => editPlan(plan)}>تعديل سريع</Button><Button size="sm" variant={plan.isActive ? 'destructive' : 'secondary'} onClick={() => togglePlan(plan)}>{plan.isActive ? 'أرشفة' : 'تفعيل'}</Button></div></TableCell></TableRow>) : <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">لا توجد خطط بعد</TableCell></TableRow>}</TableBody></Table></div></CardContent></Card>
      </div>}

      {section === 'subscribers' && <div className="space-y-6">
        <Card><CardHeader><CardTitle>إسناد اشتراك لطالب</CardTitle></CardHeader><CardContent><form onSubmit={assign} className="grid gap-3 md:grid-cols-6"><div className="space-y-2 md:col-span-2">{studentPicked ? <div className="flex h-10 items-center justify-between rounded-md border bg-background px-3 text-sm"><span className="font-medium">{studentPicked.name}{studentPicked.code ? ` — ${studentPicked.code}` : ''}</span><Button type="button" size="sm" variant="ghost" onClick={() => { setStudentPicked(null); setStudentQuery(''); setAssignForm({ ...assignForm, studentId: '' }) }}>تغيير</Button></div> : <><Input placeholder="ابحث بالاسم أو الكود أو الهاتف" value={studentQuery} onChange={e => setStudentQuery(e.target.value)} />{studentResults.length > 0 && <div className="max-h-40 divide-y overflow-y-auto rounded-md border">{studentResults.map(s => <button key={s.id} type="button" className="block w-full px-3 py-2 text-right text-sm hover:bg-muted" onClick={() => { setStudentPicked(s); setStudentResults([]); setAssignForm({ ...assignForm, studentId: s.id }) }}><div className="font-medium">{s.name}</div><div className="text-xs text-muted-foreground">{[s.code, s.phone].filter(Boolean).join(' · ') || 'بدون بيانات'}</div></button>)}</div>}<input type="hidden" value={assignForm.studentId} required /></>}</div><select className="h-10 rounded-md border bg-background px-3 text-sm" value={assignForm.planId} onChange={e => setAssignForm({ ...assignForm, planId: e.target.value })} required><option value="">اختر الخطة</option>{data.plans.filter(p => p.isActive && p.allowManualAssignment).map(p => <option key={p.id} value={p.id}>{p.title}</option>)}</select><Input type="date" value={assignForm.startDate} onChange={e => setAssignForm({ ...assignForm, startDate: e.target.value })} /><Input type="date" value={assignForm.endDate} onChange={e => setAssignForm({ ...assignForm, endDate: e.target.value })} /><select className="h-10 rounded-md border bg-background px-3 text-sm" value={assignForm.paymentStatus} onChange={e => setAssignForm({ ...assignForm, paymentStatus: e.target.value })}><option value="waived">معفى/يدوي</option><option value="paid">مدفوع</option><option value="pending">معلق</option></select><Button type="submit" disabled={isPending || !assignForm.studentId}>إسناد آمن</Button><Input className="md:col-span-2" placeholder="مرجع الدفع اختياري" value={assignForm.paymentReference} onChange={e => setAssignForm({ ...assignForm, paymentReference: e.target.value })} /></form></CardContent></Card>
        <Card><CardHeader><CardTitle>سجل المشتركين</CardTitle></CardHeader><CardContent><div className="mb-4 grid gap-2 md:grid-cols-[1fr_180px_180px_auto]"><Input placeholder="بحث بالاسم أو الكود أو الهاتف أو البريد أو الخطة" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && reload({ page: 1 })} /><select className="h-10 rounded-md border bg-background px-3 text-sm" value={status} onChange={e => { setStatus(e.target.value); reload({ status: e.target.value as any, page: 1 }) }}><option value="all">كل الحالات</option>{Object.entries(STATUS_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><select className="h-10 rounded-md border bg-background px-3 text-sm" value={planId} onChange={e => { setPlanId(e.target.value); reload({ planId: e.target.value === 'all' ? undefined : e.target.value, page: 1 }) }}><option value="all">كل الخطط</option>{data.plans.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}</select><Button onClick={() => reload({ page: 1 })} disabled={isPending}>تحديث</Button></div><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>الطالب</TableHead><TableHead>الخطة</TableHead><TableHead>الفترة</TableHead><TableHead>الدفع</TableHead><TableHead>الحالة</TableHead><TableHead>حوكمة</TableHead></TableRow></TableHeader><TableBody>{data.subscriptions.length ? data.subscriptions.map(subscription => <TableRow key={subscription.id}><TableCell><div className="font-semibold">{subscription.student?.name ?? 'طالب غير معروف'}</div><div className="text-xs text-muted-foreground">{subscription.student?.code ?? subscription.student?.phone ?? subscription.student?.email ?? 'بدون بيانات اتصال'}</div></TableCell><TableCell>{subscription.plan?.title ?? 'خطة محذوفة'}<div className="text-xs text-muted-foreground">{subscription.source}</div></TableCell><TableCell>{formatDate(subscription.startDate)} — {formatDate(subscription.endDate)}<div className="text-xs text-muted-foreground">السماح حتى {formatDate(subscription.graceUntil)}</div></TableCell><TableCell>{subscription.paymentStatus}<div className="text-xs text-muted-foreground">{subscription.paymentReference ?? 'بدون مرجع'}</div></TableCell><TableCell><span className={`rounded-full px-2 py-1 text-xs ${STATUS_STYLES[subscription.computedStatus ?? subscription.status] ?? 'bg-slate-100'}`}>{STATUS_LABELS[subscription.computedStatus ?? subscription.status] ?? subscription.computedStatus ?? subscription.status}{subscription.computedStatus === 'grace' && subscription.graceDaysLeft != null ? ` — ${subscription.graceDaysLeft} يوم` : ''}</span></TableCell><TableCell><div className="flex flex-wrap gap-1"><Button size="sm" variant="outline" onClick={() => openDetail(subscription.id)}>تفاصيل</Button>{!['cancelled'].includes(subscription.status) && <Button size="sm" variant="secondary" onClick={() => renew(subscription)}>تجديد</Button>}{['grace', 'suspended'].includes(subscription.status) && <Button size="sm" variant="secondary" onClick={() => changeStatus(subscription, 'active')}>استئناف</Button>}{subscription.status === 'active' && <><Button size="sm" variant="outline" onClick={() => changeStatus(subscription, 'grace')}>سماح</Button><Button size="sm" variant="destructive" onClick={() => changeStatus(subscription, 'suspended')}>تعليق</Button></>}{!['cancelled', 'expired'].includes(subscription.status) && <Button size="sm" variant="destructive" onClick={() => changeStatus(subscription, 'cancelled')}>إلغاء</Button>}</div></TableCell></TableRow>) : <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">لا توجد اشتراكات مطابقة</TableCell></TableRow>}</TableBody></Table></div><div className="mt-4 flex items-center justify-between text-sm text-muted-foreground"><span>إجمالي النتائج: {data.pagination.total}</span><span>صفحة {data.pagination.page} من {data.pagination.totalPages}</span></div></CardContent></Card>
        {detailFor && (
          <div className="fixed inset-0 z-50 flex" dir="rtl">
            <div className="flex-1 bg-black/40" onClick={() => setDetailFor(null)} />
            <aside className="h-full w-full max-w-xl overflow-y-auto border-r bg-background p-6 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <CardTitle className="text-lg">تفاصيل الاشتراك ودورة حياته</CardTitle>
                <Button size="sm" variant="ghost" onClick={() => setDetailFor(null)}>إغلاق</Button>
              </div>
              {detailLoading && <p className="text-sm text-muted-foreground">جارٍ التحميل…</p>}
              {!detailLoading && detail && (
                <div className="space-y-5 text-sm">
                  <section className="rounded-lg border p-4 space-y-1">
                    <p className="font-semibold">{detail.student?.name ?? 'طالب غير معروف'} {detail.student?.code ? `— ${detail.student.code}` : ''}</p>
                    <p className="text-muted-foreground">{detail.student?.phone ?? ''} {detail.student?.email ?? ''}</p>
                    <div className="flex flex-wrap items-center gap-2 pt-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[detail.computedStatus] ?? 'bg-slate-100'}`}>{STATUS_LABELS[detail.computedStatus] ?? detail.computedStatus}{detail.computedStatus === 'grace' && detail.graceDaysLeft != null ? ` — متبقٍ ${detail.graceDaysLeft} يوم` : ''}</span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-muted-foreground">الحالة المخزنة: {detail.rawStatus} (للعرض فقط)</span>
                    </div>
                  </section>

                  <section className="rounded-lg border p-4 space-y-2">
                    <p className="font-semibold">الخطة الحية</p>
                    {detail.plan ? <>
                      <p>{detail.plan.title} — {formatMoney(detail.plan.price)} / {detail.plan.durationDays} يوم</p>
                      <p className="text-muted-foreground">نطاق الخطة: {detail.plan.scopeMode === 'all_released' ? 'كل المنشور' : `محدد (${detail.plan.scopes.length} عنصر)`} · {detail.plan.isActive ? 'نشطة' : 'مؤرشفة'}</p>
                    </> : <p className="text-muted-foreground">الخطة الأصلية محذوفة.</p>}
                  </section>

                  <section className="rounded-lg border p-4 space-y-2">
                    <p className="font-semibold">لقطة ما اشتراه الطالب (عند الإسناد)</p>
                    {detail.planSnapshot ? <pre className="max-h-48 overflow-auto rounded bg-muted p-3 text-xs" dir="ltr">{JSON.stringify(detail.planSnapshot, null, 2)}</pre> : <p className="text-muted-foreground">لا توجد لقطة محفوظة لهذا الاشتراك (قد يكون مستوردًا قديمًا).</p>}
                  </section>

                  <section className="grid grid-cols-2 gap-2 rounded-lg border p-4 text-xs">
                    <div><span className="text-muted-foreground">البداية:</span> {formatDate(detail.startDate)}</div>
                    <div><span className="text-muted-foreground">النهاية:</span> {formatDate(detail.endDate)}</div>
                    <div><span className="text-muted-foreground">سماح حتى:</span> {formatDate(detail.graceUntil)}</div>
                    <div><span className="text-muted-foreground">الدفع:</span> {detail.paymentStatus}{detail.paymentReference ? ` — ${detail.paymentReference}` : ''}</div>
                    <div><span className="text-muted-foreground">آخر دفعة:</span> {formatDate(detail.lastPaymentAt)}</div>
                    <div><span className="text-muted-foreground">الفوترة القادمة:</span> {formatDate(detail.nextBillingAt)}</div>
                    {detail.cancelReason && <div className="col-span-2"><span className="text-muted-foreground">سبب الإلغاء:</span> {detail.cancelReason}</div>}
                    {detail.suspendReason && <div className="col-span-2"><span className="text-muted-foreground">سبب التعليق:</span> {detail.suspendReason}</div>}
                  </section>

                  <section className="space-y-2">
                    <p className="font-semibold">الجدول الزمني للأحداث ({detail.events.length})</p>
                    {detail.events.length ? <ol className="space-y-2 border-r pr-4">{detail.events.map(event => (
                      <li key={event.id} className="relative rounded-lg border bg-white p-3">
                        <span className="absolute -right-[21px] top-4 size-2.5 rounded-full bg-primary" />
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">{EVENT_TYPE_LABELS[event.eventType] ?? event.eventType}</span>
                          <span className="text-xs text-muted-foreground">{formatDate(event.createdAt)}</span>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          بواسطة: {event.actorName}
                          {event.fromStatus && event.toStatus ? ` · ${STATUS_LABELS[event.fromStatus] ?? event.fromStatus} → ${STATUS_LABELS[event.toStatus] ?? event.toStatus}` : ''}
                        </div>
                        {event.reason && <div className="mt-1 text-xs">{event.reason}</div>}
                        {(event.metadata != null || event.paymentReference) && (
                          <details className="mt-1">
                            <summary className="cursor-pointer text-xs text-primary">بيانات إضافية</summary>
                            <pre className="mt-1 max-h-32 overflow-auto rounded bg-muted p-2 text-[10px]" dir="ltr">{JSON.stringify({ paymentReference: event.paymentReference, metadata: event.metadata }, null, 2)}</pre>
                          </details>
                        )}
                      </li>
                    ))}</ol> : <p className="text-muted-foreground">لا توجد أحداث مسجلة.</p>}
                  </section>
                </div>
              )}
            </aside>
          </div>
        )}
      </div>}

      {section === 'settings' && <div className="grid gap-6 lg:grid-cols-2"><Card><CardHeader><CardTitle>وضع البيع والوصول</CardTitle></CardHeader><CardContent><form onSubmit={saveSettings} className="space-y-4"><select name="mode" defaultValue={data.settings.mode} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="purchases_only">شراء فردي فقط</option><option value="subscriptions_only">اشتراكات فقط</option><option value="hybrid">شراء فردي + اشتراكات</option></select><div><label className="mb-1 block text-sm font-medium">فترة السماح بعد الاستحقاق بالأيام</label><Input name="gracePeriodDays" type="number" min="0" max="90" defaultValue={data.settings.gracePeriodDays} /></div><Button type="submit" disabled={isPending}>حفظ الإعدادات</Button></form></CardContent></Card><Card><CardHeader><CardTitle>ملاحظات الحوكمة</CardTitle></CardHeader><CardContent className="space-y-3 text-sm text-muted-foreground"><p>تغيير الوضع يؤثر على منح الوصول الجديد فقط، ولا يحذف مشتريات الطلاب السابقة.</p><p>إيقاف خطة يمنع الاشتراكات الجديدة والإسناد اليدوي، ولا يلغي تلقائيًا سجلات الاشتراكات القائمة.</p><p>الإلغاء والتعليق انتقالات صريحة تُسجل بالفاعل والسبب ووقت التنفيذ.</p><p>تأكد من مراجعة مرجع الدفع قبل الإسناد اليدوي للطلاب.</p></CardContent></Card></div>}
    </div>
  )
}

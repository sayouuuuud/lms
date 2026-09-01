"use client"
import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ReceiptDropzone } from "@/components/ui/receipt-dropzone"
import { getPaymentAccounts } from "@/app/cart-actions"
import { createSubscriptionRequest, cancelSubscriptionRequest } from "./actions"

type MySubscription = {
  id: string
  planId: string
  planTitle: string
  price: number
  durationDays: number
  state: 'active' | 'grace' | 'expiring' | 'ended'
  graceDaysLeft: number | null
  snapshotTitle: string | null
  snapshotDurationDays: number | null
  startDate: string
  endDate: string
}

type AvailablePlan = {
  id: string
  title: string
  description: string
  marketingLabel: string | null
  shortDescription: string
  imageUrl: string | null
  price: number
  durationDays: number
  billingPeriod: string
  scopeMode: string
  scopeLabel: string
  featured: boolean
}

type RequestRow = {
  id: string
  code: string
  status: 'pending' | 'approved' | 'rejected'
  planTitle: string
  createdAt: string
  adminNote?: string | null
}

type PaymentAccount = { method: string; account: string; holder: string; note?: string }

const REQUEST_STATUS: Record<string, { label: string; className: string }> = {
  pending: { label: 'قيد المراجعة', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  approved: { label: 'معتمد', className: 'bg-purple-50 text-brand border-brand' },
  rejected: { label: 'مرفوض', className: 'bg-rose-50 text-rose-700 border-rose-200' },
}

const SUB_STATE: Record<string, { label: string; className: string }> = {
  active: { label: 'فعّال', className: 'bg-purple-50 text-brand border-brand' },
  grace: { label: 'فترة سماح — جدّد الآن', className: 'bg-amber-100 text-amber-800 border-amber-300' },
  expiring: { label: 'قارب على الانتهاء', className: 'bg-orange-50 text-orange-700 border-orange-200' },
  ended: { label: 'منتهي', className: 'bg-slate-100 text-slate-600 border-slate-200' },
}

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat('ar-EG', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(dateString))
}

export function StudentSubscriptionsClient({
  mySubscriptions,
  availablePlans,
  requests,
  preselectedPlanId,
  subscriptionsEnabled,
}: {
  mySubscriptions: MySubscription[]
  availablePlans: AvailablePlan[]
  requests: RequestRow[]
  preselectedPlanId: string | null
  subscriptionsEnabled: boolean
}) {
  const searchParams = useSearchParams()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<AvailablePlan | null>(null)
  const [accounts, setAccounts] = useState<PaymentAccount[]>([])
  const [method, setMethod] = useState('')
  const [reference, setReference] = useState('')
  const [note, setNote] = useState('')
  const [receiptUrl, setReceiptUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // فتح الحوار تلقائيًا عند القدوم من صفحة خطة عامة أو بعد التسجيل (?planId=...)
  useEffect(() => {
    const fromUrl = preselectedPlanId ?? searchParams.get('planId')
    if (!fromUrl) return
    const plan = availablePlans.find(p => p.id === fromUrl)
    if (plan) openDialog(plan)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function openDialog(plan: AvailablePlan) {
    setSelectedPlan(plan)
    setReceiptUrl('')
    setMethod('')
    setReference('')
    setNote('')
    setDialogOpen(true)
    if (accounts.length === 0) {
      const list = await getPaymentAccounts().catch(() => [])
      setAccounts(list)
    }
  }

  async function submitRequest() {
    if (!selectedPlan || !method || !receiptUrl) return
    setSubmitting(true)
    const result = await createSubscriptionRequest({
      planId: selectedPlan.id,
      method,
      reference,
      receiptUrl,
      note,
    })
    setSubmitting(false)
    if (result.ok) {
      setDialogOpen(false)
      window.location.reload()
    } else {
      alert(result.error)
    }
  }

  async function cancelRequest(requestId: string) {
    const result = await cancelSubscriptionRequest(requestId)
    if (result.ok) window.location.reload()
    else alert(result.error)
  }

  return (
    <div className="space-y-10">
      {!subscriptionsEnabled && mySubscriptions.length > 0 && (
        <div className="rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          نظام الاشتراكات موقوف مؤقتًا على المنصة (وضع الشراء الفردي). اشتراكاتك القائمة ظاهرة أدناه موسومة بـ «غير مفعّل حاليًا» حتى إعادة التفعيل.
        </div>
      )}

      <section>
        <h2 className="text-xl font-bold mb-4">اشتراكاتي الحالية</h2>
        {mySubscriptions.length === 0 ? (
          <div className="text-muted-foreground bg-muted p-6 rounded-lg text-center">
            ليس لديك أي اشتراكات فعالة حالياً.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mySubscriptions.map(sub => {
              const badge = SUB_STATE[sub.state]
              const renewEligible = subscriptionsEnabled && (sub.state === 'grace' || sub.state === 'expiring' || sub.state === 'ended')
              const sourcePlan = availablePlans.find(p => p.id === sub.planId)
              const graceSuffix = sub.state === 'grace' && sub.graceDaysLeft != null ? ` — متبقٍ ${sub.graceDaysLeft} يوم` : ''
              return (
                <Card key={sub.id} className={sub.state === 'active' ? 'border-primary ring-1 ring-primary/20' : 'border-amber-300 ring-1 ring-amber-200'}>
                  <CardHeader>
                    <div className="flex flex-wrap justify-between items-start gap-2">
                      <CardTitle className="text-lg">{sub.planTitle}</CardTitle>
                      <div className="flex flex-wrap gap-1">
                        {!subscriptionsEnabled && (
                          <Badge variant="outline" className="bg-slate-100 text-slate-500 border-slate-300">غير مفعّل حاليًا</Badge>
                        )}
                        <Badge variant="outline" className={badge.className}>{badge.label}{graceSuffix}</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {/* ملخص التغطية من اللقطة المجمدة وقت الشراء — لا يتأثر بتعديلات الخطة لاحقًا */}
                    <div className="text-sm">
                      <span className="text-muted-foreground">ما اشتريته: </span>
                      <span className="font-medium">{sub.snapshotTitle ?? sub.planTitle}{sub.snapshotDurationDays ? ` — ${sub.snapshotDurationDays} يوم` : ` — ${sub.durationDays} يوم`}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">تاريخ البدء: </span>
                      <span className="font-medium">{formatDate(sub.startDate)}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">تاريخ الانتهاء: </span>
                      <span className="font-medium">{formatDate(sub.endDate)}</span>
                    </div>
                  </CardContent>
                  {renewEligible && sourcePlan && (
                    <CardFooter>
                      <Button className="w-full" onClick={() => openDialog(sourcePlan)}>جدد الاشتراك</Button>
                    </CardFooter>
                  )}
                </Card>
              )
            })}
          </div>
        )}
      </section>

      {requests.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-4">طلباتي</h2>
          <div className="space-y-3">
            {requests.map(req => {
              const badge = REQUEST_STATUS[req.status]
              return (
                <div key={req.id} className="flex flex-col gap-2 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="font-medium">{req.planTitle} <span className="text-xs text-muted-foreground">({req.code})</span></div>
                    <div className="text-xs text-muted-foreground">قدِّم في {formatDate(req.createdAt)}</div>
                    {req.status === 'rejected' && req.adminNote && (
                      <div className="mt-1 text-xs text-rose-700">سبب الرفض: {req.adminNote}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={badge.className}>{badge.label}</Badge>
                    {req.status === 'pending' && (
                      <Button size="sm" variant="ghost" onClick={() => cancelRequest(req.id)}>إلغاء الطلب</Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {subscriptionsEnabled && (
        <section>
          <h2 className="text-xl font-bold mb-4">الباقات المتاحة</h2>
          {availablePlans.length === 0 ? (
            <div className="text-muted-foreground">
              لا توجد باقات متاحة حالياً.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {availablePlans.map(plan => (
                <Card key={plan.id} className="flex flex-col">
                  <CardHeader>
                    {plan.marketingLabel && <div className="text-xs font-bold text-gold-deep">{plan.marketingLabel}</div>}
                    <CardTitle>{plan.title}</CardTitle>
                    <div className="text-2xl font-bold mt-2 text-primary">{plan.price} ج.م</div>
                  </CardHeader>
                  <CardContent className="flex-1 space-y-4">
                    <div className="text-sm text-muted-foreground line-clamp-3">
                      {plan.shortDescription || plan.description || "لا يوجد وصف."}
                    </div>
                    <div className="text-sm font-medium">
                      {plan.scopeLabel} · المدة: {plan.durationDays} يوم
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button className="w-full" onClick={() => openDialog(plan)}>
                      اشتراك
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </section>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
          {selectedPlan && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedPlan.title}</DialogTitle>
                <DialogDescription>
                  {selectedPlan.price} ج.م · {selectedPlan.durationDays} يوم — أرفق إيصال التحويل وستُراجع الإدارة طلبك.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5 py-2">
                {accounts.length > 0 && (
                  <div className="rounded-lg border bg-muted/40 p-4 space-y-2 text-sm">
                    <p className="font-semibold">حوّل إلى:</p>
                    {accounts.map(account => (
                      <div key={account.method} className="flex items-center justify-between gap-2">
                        <span className="font-medium">{account.method}</span>
                        <span dir="ltr" className="font-mono text-xs">{account.account}</span>
                        <span className="text-xs text-muted-foreground">{account.holder}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-2">
                  <p className="text-sm font-medium">وسيلة الدفع</p>
                  <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={method} onChange={e => setMethod(e.target.value)}>
                    <option value="">اختر الوسيلة</option>
                    {accounts.map(a => <option key={a.method} value={a.method}>{a.method}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">صورة الإيصال</p>
                  <ReceiptDropzone value={receiptUrl} onChange={setReceiptUrl} />
                </div>

                <Input placeholder="رقم عملية التحويل (اختياري)" value={reference} onChange={e => setReference(e.target.value)} />
                <Textarea placeholder="ملاحظة للإدارة (اختياري)" value={note} onChange={e => setNote(e.target.value)} rows={2} />
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
                <Button onClick={submitRequest} disabled={submitting || !method || !receiptUrl}>
                  {submitting ? 'جارٍ الإرسال…' : 'إرسال الطلب'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ShoppingCart,
  X,
  Trash2,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  CreditCard,
} from 'lucide-react'
import { toast } from 'sonner'
import { useCart } from './cart-provider'
import { createOrder, getCheckoutDefaults } from '@/app/cart-actions'

function formatEGP(value: number) {
  return new Intl.NumberFormat('ar-EG').format(value)
}

const PAYMENT_METHODS = [
  'فودافون كاش',
  'اتصالات كاش',
  'أورنج كاش',
  'إنستا باي',
  'تحويل بنكي',
]

type View = 'cart' | 'checkout' | 'done'

export function CartModal() {
  const { open, setOpen, items, total, count, remove } = useCart()
  const [mounted, setMounted] = useState(false)
  const [view, setView] = useState<View>('cart')
  const [submitting, setSubmitting] = useState(false)
  const [orderCode, setOrderCode] = useState('')

  // form state
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [method, setMethod] = useState(PAYMENT_METHODS[0])
  const [reference, setReference] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => setMounted(true), [])

  // reset to cart view whenever the modal closes
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => setView('cart'), 200)
      return () => clearTimeout(t)
    }
  }, [open])

  // prefill checkout defaults when entering the form
  useEffect(() => {
    if (view === 'checkout') {
      getCheckoutDefaults().then((d) => {
        setName((v) => v || d.name)
        setPhone((v) => v || d.phone)
      })
    }
  }, [view])

  // lock body scroll while open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [open])

  if (!mounted || !open) return null

  async function submitOrder(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !phone.trim()) {
      toast.error('من فضلك اكتب الاسم ورقم الهاتف')
      return
    }
    setSubmitting(true)
    const res = await createOrder({ name, phone, method, reference, note })
    setSubmitting(false)
    if (res?.error) {
      toast.error(typeof res.error === 'string' ? res.error : 'تعذّر إرسال الطلب')
      return
    }
    setOrderCode(res.code ?? '')
    setView('done')
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* overlay */}
      <button
        type="button"
        aria-label="إغلاق"
        onClick={() => setOpen(false)}
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
      />

      {/* window */}
      <div className="relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-border bg-background shadow-2xl">
        {/* header */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-6 py-4">
          <div className="flex items-center gap-2.5">
            {view === 'checkout' && (
              <button
                type="button"
                onClick={() => setView('cart')}
                className="grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
                aria-label="رجوع للسلة"
              >
                <ArrowLeft className="size-4 -scale-x-100" />
              </button>
            )}
            <div className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
              {view === 'done' ? (
                <CheckCircle2 className="size-5" />
              ) : view === 'checkout' ? (
                <CreditCard className="size-5" />
              ) : (
                <ShoppingCart className="size-5" />
              )}
            </div>
            <h2 className="text-lg font-bold text-foreground">
              {view === 'cart' && `سلة الاشتراكات${count > 0 ? ` (${count})` : ''}`}
              {view === 'checkout' && 'إتمام الطلب'}
              {view === 'done' && 'تم استلام طلبك'}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
            aria-label="إغلاق"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* body */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {/* ── Cart view ── */}
          {view === 'cart' &&
            (count === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
                <div className="grid size-16 place-items-center rounded-full bg-muted text-muted-foreground">
                  <ShoppingCart className="size-7" />
                </div>
                <p className="text-base font-semibold text-foreground">السلة فاضية</p>
                <p className="max-w-xs text-sm text-muted-foreground">
                  ضيف المحاضرات اللي عايز تشترك فيها من صفحات الفروع وهتلاقيها هنا.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {items.map((item) => (
                  <li key={item.lectureId} className="flex items-start gap-3 px-6 py-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-foreground">
                        {item.title}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {item.stageTitle} · {item.branchTitle}
                      </p>
                      <p className="mt-1 text-sm font-bold text-primary">
                        {formatEGP(item.price)} ج.م
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(item.lectureId)}
                      className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`إزالة ${item.title}`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            ))}

          {/* ── Checkout view ── */}
          {view === 'checkout' && (
            <form id="checkout-form" onSubmit={submitOrder} className="space-y-4 px-6 py-5">
              <div className="rounded-2xl bg-muted/50 px-4 py-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">عدد المحاضرات</span>
                  <span className="font-bold text-foreground">{count}</span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-muted-foreground">الإجمالي</span>
                  <span className="font-bold text-primary">{formatEGP(total)} ج.م</span>
                </div>
              </div>

              <Field label="الاسم بالكامل" required>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputCls}
                  placeholder="اكتب اسمك"
                />
              </Field>

              <Field label="رقم الهاتف" required>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  inputMode="tel"
                  className={inputCls}
                  placeholder="01xxxxxxxxx"
                />
              </Field>

              <Field label="وسيلة الدفع">
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className={inputCls}
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="رقم العملية / التحويل (اختياري)">
                <input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className={inputCls}
                  placeholder="رقم تحويل فودافون كاش مثلاً"
                />
              </Field>

              <Field label="ملاحظة للأدمن (اختياري)">
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  className={`${inputCls} h-auto min-h-[68px] resize-none py-2.5`}
                  placeholder="أي تفاصيل إضافية..."
                />
              </Field>
            </form>
          )}

          {/* ── Done view ── */}
          {view === 'done' && (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
              <div className="grid size-16 place-items-center rounded-full bg-primary/10 text-primary">
                <CheckCircle2 className="size-8" />
              </div>
              <p className="text-base font-bold text-foreground">تم إرسال طلبك للأدمن</p>
              <p className="max-w-xs text-sm text-muted-foreground">
                رقم الطلب <span className="font-mono font-bold text-foreground">{orderCode}</span>.
                هيتم مراجعته والتواصل معاك قريبًا من خلال الرسائل.
              </p>
            </div>
          )}
        </div>

        {/* footer */}
        {view === 'cart' && count > 0 && (
          <div className="shrink-0 border-t border-border px-6 py-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">الإجمالي</span>
              <span className="text-xl font-extrabold text-foreground">
                {formatEGP(total)} <span className="text-sm font-bold text-primary">ج.م</span>
              </span>
            </div>
            <button
              type="button"
              onClick={() => setView('checkout')}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
            >
              <CreditCard className="size-4" />
              إتمام الدفع
            </button>
          </div>
        )}

        {view === 'checkout' && (
          <div className="shrink-0 border-t border-border px-6 py-4">
            <button
              type="submit"
              form="checkout-form"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  جارٍ الإرسال...
                </>
              ) : (
                <>إرسال الطلب ({formatEGP(total)} ج.م)</>
              )}
            </button>
          </div>
        )}

        {view === 'done' && (
          <div className="shrink-0 border-t border-border px-6 py-4">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full rounded-full bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
            >
              تمام
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

const inputCls =
  'h-11 w-full rounded-xl border border-border bg-secondary/50 px-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:bg-background'

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-foreground">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </span>
      {children}
    </label>
  )
}

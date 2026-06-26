'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { updatePaymentStatus } from '@/app/(admin)/payments/actions'
import {
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  Wallet,
  TrendingUp,
  Eye,
  Check,
  X,
  Smartphone,
  CreditCard,
  Mail,
  Phone,
  BookOpen,
  Hash,
  CalendarDays,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { getInitials } from '@/lib/get-initials'
import {
  paymentStatusFilters,
  getPaymentStats,
  type PaymentRecord,
  type PaymentStatus,
} from '@/lib/payments-data'

const statusStyles: Record<PaymentStatus, string> = {
  'قيد المراجعة':
    'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400',
  مقبول:
    'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400',
  مرفوض:
    'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400',
}

function MethodBadge({ method }: { method: PaymentRecord['method'] }) {
  const isInsta = method === 'انستاباي'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium',
        isInsta
          ? 'border-primary/20 bg-primary/10 text-primary'
          : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400',
      )}
    >
      {isInsta ? <CreditCard className="size-3.5" /> : <Smartphone className="size-3.5" />}
      {method}
    </span>
  )
}

function DetailRow({
  icon: Icon,
  label,
  value,
  dir,
  mono,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  dir?: 'ltr' | 'rtl'
  mono?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
      <span className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4 shrink-0" />
        {label}
      </span>
      <span
        dir={dir}
        className={cn(
          'truncate text-left font-medium text-foreground',
          mono && 'font-mono',
        )}
      >
        {value}
      </span>
    </div>
  )
}

export function PaymentsTable({ initialPayments }: { initialPayments: PaymentRecord[] }) {
  const router = useRouter()
  const [records, setRecords] = useState<PaymentRecord[]>(initialPayments)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<PaymentStatus | 'الكل'>('الكل')
  const [preview, setPreview] = useState<PaymentRecord | null>(null)

  const stats = useMemo(() => getPaymentStats(records), [records])

  const statCards = [
    {
      label: 'طلبات قيد المراجعة',
      value: String(stats.pending),
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-50 dark:bg-amber-500/10',
    },
    {
      label: 'طلبات مقبولة',
      value: String(stats.approvedCount),
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    },
    {
      label: 'طلبات مرفوضة',
      value: String(stats.rejected),
      icon: XCircle,
      color: 'text-rose-600',
      bg: 'bg-rose-50 dark:bg-rose-500/10',
    },
    {
      label: 'إجمالي الإيرادات',
      value: `${stats.totalRevenue.toLocaleString('en-US')} ج.م`,
      icon: Wallet,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
  ]

  const filtered = useMemo(() => {
    return records.filter((r) => {
      const matchesStatus = status === 'الكل' || r.status === status
      const q = query.trim()
      const matchesQuery =
        q === '' ||
        r.studentName.includes(q) ||
        r.course.includes(q) ||
        r.reference.includes(q)
      return matchesStatus && matchesQuery
    })
  }, [records, query, status])

  async function updateStatus(id: string, next: PaymentStatus) {
    const original = [...records]
    setRecords((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: next } : r)),
    )
    setPreview((p) => (p && p.id === id ? { ...p, status: next } : p))
    
    const res = await updatePaymentStatus(id, next)
    if (res.error) {
      toast.error(res.error)
      setRecords(original)
      setPreview((p) => (p && p.id === id ? original.find(o => o.id === id) || p : p))
    } else {
      toast.success('تم تحديث حالة الطلب بنجاح')
      router.refresh()
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="gap-0 p-5 transition-shadow hover:shadow-md">
            <div className="flex items-start justify-between">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <div
                className={cn(
                  'flex size-10 items-center justify-center rounded-xl',
                  stat.bg,
                )}
              >
                <stat.icon className={cn('size-5', stat.color)} />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-2xl font-bold text-foreground">{stat.value}</span>
            </div>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden p-0">
        {/* Toolbar */}
        <div className="flex flex-col gap-4 border-b border-border p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {paymentStatusFilters.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => setStatus(filter.value)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                  status === filter.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground hover:text-foreground',
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="relative w-full lg:w-72">
            <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث باسم الطالب أو الكورس..."
              className="w-full rounded-lg border border-border bg-background py-2 pr-9 pl-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
            />
          </div>
        </div>

        {/* Desktop table */}
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full text-right text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="px-5 py-3 font-medium">الطالب</th>
                <th className="px-5 py-3 font-medium">الكورس</th>
                <th className="px-5 py-3 font-medium">المبلغ</th>
                <th className="px-5 py-3 font-medium">طريقة التحويل</th>
                <th className="px-5 py-3 font-medium">التاريخ</th>
                <th className="px-5 py-3 font-medium">الحالة</th>
                <th className="px-5 py-3 font-medium">الطلب</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-border last:border-0 hover:bg-secondary/50"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-9">
                        <AvatarFallback className="bg-primary/10 text-xs text-primary">
                          {getInitials(r.studentName)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-foreground">{r.studentName}</p>
                        <p className="text-xs text-muted-foreground">{r.studentEmail}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-foreground">{r.course}</td>
                  <td className="px-5 py-4 font-semibold text-foreground">
                    {r.amount.toLocaleString('en-US')} ج.م
                  </td>
                  <td className="px-5 py-4">
                    <MethodBadge method={r.method} />
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">{r.submittedAt}</td>
                  <td className="px-5 py-4">
                    <Badge
                      variant="outline"
                      className={cn('font-medium', statusStyles[r.status])}
                    >
                      {r.status}
                    </Badge>
                  </td>
                  <td className="px-5 py-4">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8"
                      onClick={() => setPreview(r)}
                    >
                      <Eye className="size-4" />
                      عرض الطلب
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="divide-y divide-border lg:hidden">
          {filtered.map((r) => (
            <div key={r.id} className="space-y-3 p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="size-9">
                    <AvatarFallback className="bg-primary/10 text-xs text-primary">
                      {getInitials(r.studentName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-foreground">{r.studentName}</p>
                    <p className="text-xs text-muted-foreground">{r.submittedAt}</p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={cn('font-medium', statusStyles[r.status])}
                >
                  {r.status}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">الكورس</p>
                  <p className="text-foreground">{r.course}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">المبلغ</p>
                  <p className="font-semibold text-foreground">
                    {r.amount.toLocaleString('en-US')} ج.م
                  </p>
                </div>
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">طريقة التحويل</p>
                  <MethodBadge method={r.method} />
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => setPreview(r)}
              >
                <Eye className="size-4" />
                عرض الطلب
              </Button>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <TrendingUp className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">لا توجد طلبات دفع مطابقة</p>
          </div>
        )}
      </Card>

      {/* Receipt preview modal */}
      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setPreview(null)}
          role="dialog"
          aria-modal="true"
          aria-label="معاينة إيصال التحويل"
        >
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-card p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <Avatar className="size-11">
                  <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                    {getInitials(preview.studentName)}
                  </AvatarFallback>
                </Avatar>
                <div className="text-right">
                  <h3 className="text-base font-bold text-foreground">{preview.studentName}</h3>
                  <p className="font-mono text-xs text-muted-foreground">{preview.id}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => setPreview(null)}
              >
                <X className="size-4" />
                <span className="sr-only">إغلاق</span>
              </Button>
            </div>

            {/* بيانات التواصل */}
            <div className="mt-4 space-y-1">
              <p className="mb-2 text-xs font-semibold text-muted-foreground">بيانات الطالب</p>
              <DetailRow icon={Mail} label="البريد الإلكتروني" value={preview.studentEmail} dir="ltr" />
              <DetailRow icon={Phone} label="رقم الهاتف" value={preview.studentPhone} dir="ltr" />
              <DetailRow icon={BookOpen} label="الكورس" value={preview.course} />
            </div>

            {/* تفاصيل الدفع */}
            <div className="mt-4 space-y-1 rounded-xl bg-secondary/50 p-4">
              <p className="mb-2 text-xs font-semibold text-muted-foreground">تفاصيل الدفع</p>
              <div className="flex items-center justify-between py-1.5 text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Wallet className="size-4" />
                  المبلغ
                </span>
                <span className="text-base font-bold text-foreground">
                  {preview.amount.toLocaleString('en-US')} ج.م
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <CreditCard className="size-4" />
                  طريقة التحويل
                </span>
                <MethodBadge method={preview.method} />
              </div>
              <DetailRow icon={Hash} label="رقم العملية" value={preview.reference} dir="ltr" mono />
              <DetailRow icon={CalendarDays} label="تاريخ الطلب" value={preview.submittedAt} />
            </div>

            {/* صورة التحويل */}
            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold text-muted-foreground">صورة التحويل</p>
              <div className="overflow-hidden rounded-xl border border-border">
                <Image
                  src={preview.receiptUrl || '/placeholder.svg'}
                  alt={`إيصال تحويل ${preview.studentName}`}
                  width={500}
                  height={700}
                  className="h-auto w-full object-contain"
                />
              </div>
            </div>

            {preview.status === 'قيد المراجعة' ? (
              <div className="mt-4 flex gap-2">
                <Button
                  className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700"
                  onClick={() => updateStatus(preview.id, 'مقبول')}
                >
                  <Check className="size-4" />
                  قبول الطلب
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-500/30 dark:hover:bg-rose-500/10"
                  onClick={() => updateStatus(preview.id, 'مرفوض')}
                >
                  <X className="size-4" />
                  رفض الطلب
                </Button>
              </div>
            ) : (
              <div className="mt-4">
                <Badge
                  variant="outline"
                  className={cn('w-full justify-center py-2', statusStyles[preview.status])}
                >
                  {preview.status}
                </Badge>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

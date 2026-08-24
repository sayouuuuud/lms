import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, CheckCircle2, Clock3, Layers3, ShieldCheck } from 'lucide-react'
import { notFound } from 'next/navigation'
import { auth } from '@/auth'
import { getPublicSubscriptionContext, getPublicSubscriptionPlan } from '@/lib/subscription-public'

function formatMoney(value: number) {
  return new Intl.NumberFormat('ar-EG').format(value)
}

function periodLabel(period: string, days: number) {
  if (period === 'month') return 'شهر واحد'
  if (period === 'term') return 'ترم كامل'
  if (period === 'year') return 'سنة كاملة'
  return `${days} يومًا`
}

function scopeText(scopeType: string) {
  if (scopeType === 'all_released') return 'كل المحتوى المنشور'
  if (scopeType === 'branch') return 'فرع محدد'
  if (scopeType === 'stage') return 'مرحلة دراسية محددة'
  if (scopeType === 'term') return 'ترم محدد'
  if (scopeType === 'course') return 'كورس محدد'
  if (scopeType === 'lecture') return 'محاضرة محددة'
  return 'محتوى محدد'
}

export default async function SubscriptionPlanPage({ params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params
  const ctx = await getPublicSubscriptionContext()
  if (!ctx.subscriptionsEnabled) {
    return (
      <main className="grid min-h-screen place-items-center bg-background px-4 py-16" dir="rtl">
        <div className="max-w-md rounded-[2rem] border border-border bg-card p-10 text-center shadow-sm dark:border-border dark:bg-card">
          <h1 className="font-heading text-2xl font-extrabold text-foreground">الاشتراكات غير متاحة حاليًا</h1>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">هذه الخطة غير متاحة في الوقت الحالي.</p>
          <Link href="/" className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition hover:bg-primary-deep"><ArrowRight className="size-4" />العودة للرئيسية</Link>
        </div>
      </main>
    )
  }
  const plan = await getPublicSubscriptionPlan(planId)
  if (!plan) notFound()

  // الطالب المسجل يدخل مسار الاشتراك مباشرة بدل صفحة التسجيل.
  const session = await auth()
  const role = (session?.user as { role?: string } | undefined)?.role
  const isStudent = !!session?.user?.id && role !== 'admin' && role !== 'assistant'
  const ctaHref = isStudent
    ? `/student/subscriptions?planId=${encodeURIComponent(plan.id)}`
    : `/auth/register?planId=${encodeURIComponent(plan.id)}`
  const ctaLabel = isStudent ? 'اشترك الآن' : 'ابدأ الاشتراك'

  return (
    <main className="min-h-screen bg-background px-4 py-14 sm:px-6 md:px-10" dir="rtl">
      <div className="mx-auto max-w-6xl">
        <Link href="/subscriptions" className="inline-flex items-center gap-2 text-sm font-bold text-emerald-deep hover:underline dark:text-teal-glow"><ArrowRight className="size-4" />العودة إلى الخطط</Link>
        <div className="mt-7 grid overflow-hidden rounded-[2rem] border border-border bg-card shadow-xl lg:grid-cols-[0.85fr_1.15fr] dark:border-border dark:bg-card">
          <div className="relative min-h-72 bg-gradient-to-br from-primary/15 to-gold/20 lg:min-h-full">{plan.imageUrl ? <Image src={plan.imageUrl} alt={plan.title} fill priority className="object-cover" sizes="(max-width: 1024px) 100vw, 42vw" /> : <div className="grid h-full min-h-72 place-items-center font-heading text-4xl font-extrabold text-primary/30">اشتراك</div>}<div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy/70 to-transparent p-6 pt-20"><span className="rounded-full bg-gold px-3 py-1 text-xs font-bold text-foreground">{plan.scopeLabel}</span></div></div>
          <div className="p-6 sm:p-9">
            {plan.marketingLabel && <div className="text-sm font-bold text-gold-deep dark:text-teal-glow">{plan.marketingLabel}</div>}
            <h1 className="mt-2 font-heading text-3xl font-extrabold text-foreground sm:text-4xl">{plan.title}</h1>
            <p className="mt-4 leading-8 text-foreground-soft dark:text-muted-foreground">{plan.description || plan.shortDescription}</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-muted p-4"><Clock3 className="size-5 text-gold-deep dark:text-teal-glow" /><div className="mt-2 text-xs text-foreground-soft dark:text-muted-foreground">المدة</div><strong className="mt-1 block text-sm text-foreground">{periodLabel(plan.billingPeriod, plan.durationDays)}</strong></div><div className="rounded-2xl bg-muted p-4"><Layers3 className="size-5 text-gold-deep dark:text-teal-glow" /><div className="mt-2 text-xs text-foreground-soft dark:text-muted-foreground">التغطية</div><strong className="mt-1 block text-sm text-foreground">{plan.scopeLabel}</strong></div><div className="rounded-2xl bg-muted p-4"><ShieldCheck className="size-5 text-gold-deep dark:text-teal-glow" /><div className="mt-2 text-xs text-foreground-soft dark:text-muted-foreground">نوع الوصول</div><strong className="mt-1 block text-sm text-foreground">مؤقت حتى انتهاء الخطة</strong></div></div>
            <div className="mt-7 flex flex-col gap-4 rounded-2xl border border-gold/30 bg-gold/10 p-5 sm:flex-row sm:items-center sm:justify-between"><div><div className="text-sm font-bold text-foreground">سعر الاشتراك</div><div className="mt-1 font-heading text-3xl font-extrabold text-foreground">{formatMoney(plan.price)} <small className="text-sm font-normal">ج.م</small></div></div><Link href={ctaHref} className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-bold text-primary-foreground transition hover:bg-primary-deep">{ctaLabel} <ArrowRight className="size-4 -rotate-180" /></Link></div>
          </div>
        </div>
        <section className="mt-7 rounded-[2rem] border border-border bg-card p-6 shadow-sm sm:p-8 dark:border-border dark:bg-card"><h2 className="font-heading text-2xl font-extrabold text-foreground">ماذا يشمل الاشتراك؟</h2><p className="mt-2 text-sm leading-7 text-foreground-soft dark:text-muted-foreground">الوصول الذي تمنحه هذه الخطة ينتهي بانتهاء مدتها، بينما أي كورس اشتريته بشكل منفرد يظل مملوكًا لك بشكل دائم.</p><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{plan.scopes.length ? plan.scopes.map((scope, index) => <div key={`${scope.scopeType}-${scope.scopeId ?? index}`} className="flex items-center gap-3 rounded-2xl bg-muted p-4 text-sm font-bold text-foreground"><CheckCircle2 className="size-5 shrink-0 text-emerald-deep dark:text-teal-glow" />{scopeText(scope.scopeType)}</div>) : <div className="rounded-2xl bg-muted p-4 text-sm font-bold text-foreground">كل المحتوى المنشور المتاح ضمن المنصة</div>}</div></section>
      </div>
    </main>
  )
}

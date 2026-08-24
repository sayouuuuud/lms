import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, SlidersHorizontal } from 'lucide-react'
import { getCurriculum } from '@/lib/curriculum'
import { getPublicSubscriptionContext, getPublicSubscriptionPlans } from '@/lib/subscription-public'

function formatMoney(value: number) {
  return new Intl.NumberFormat('ar-EG').format(value)
}

function periodLabel(period: string, days: number) {
  if (period === 'month') return 'شهري'
  if (period === 'term') return 'اشتراك ترم'
  if (period === 'year') return 'سنوي'
  return `${days} يومًا`
}

export const metadata = {
  title: 'خطط الاشتراك',
  description: 'اختر السنة والفرع ثم استعرض خطط الاشتراك المناسبة لمحتوى Lms Upgrade.',
}

export default async function SubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ stageId?: string; branchId?: string }>
}) {
  const params = await searchParams
  const ctx = await getPublicSubscriptionContext()
  if (!ctx.subscriptionsEnabled) {
    return (
      <main className="grid min-h-screen place-items-center bg-background px-4 py-16" dir="rtl">
        <div className="max-w-md rounded-[2rem] border border-border bg-card p-10 text-center shadow-sm dark:border-border dark:bg-card">
          <h1 className="font-heading text-2xl font-extrabold text-foreground">الاشتراكات غير متاحة حاليًا</h1>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">منصة تعمل حاليًا بنظام الشراء الفردي فقط. تابعوا إعلان باقات الاشتراك قريبًا.</p>
          <Link href="/" className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition hover:bg-primary-deep"><ArrowLeft className="size-4" />العودة للرئيسية</Link>
        </div>
      </main>
    )
  }
  const stages = await getCurriculum()
  const selectedStage = stages.find((stage) => stage.id === params.stageId)
  const selectedBranch = selectedStage?.branches.find((branch) => branch.id === params.branchId)
  const plans = await getPublicSubscriptionPlans({ stageId: params.stageId, branchId: params.branchId })

  return (
    <main className="min-h-screen bg-background px-4 py-16 sm:px-6 md:px-10" dir="rtl">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <Link href="/" className="text-sm font-bold text-emerald-deep hover:underline dark:text-teal-glow">العودة للرئيسية</Link>
            <h1 className="mt-4 font-heading text-4xl font-extrabold text-foreground">اختَر اشتراكك المناسب</h1>
            <p className="mt-3 max-w-2xl leading-8 text-foreground-soft dark:text-muted-foreground">ابدأ بالسنة، ثم اختر الفرع إن كنت تريد خطة مخصصة. كل خطة توضّح نطاق المحتوى ومدة الوصول قبل أن تختارها.</p>
          </div>
          <div className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground-soft shadow-sm dark:border-border dark:bg-card dark:text-muted-foreground"><SlidersHorizontal className="ml-2 inline-block size-4 text-gold-deep dark:text-teal-glow" />الاشتراك وصول مؤقت، أما الشراء المنفرد فملكية دائمة.</div>
        </div>

        <form className="mt-10 grid gap-4 rounded-[2rem] border border-border bg-card p-5 shadow-sm sm:grid-cols-2 sm:p-7 dark:border-border dark:bg-card" method="get">
          <label className="flex flex-col gap-2 text-sm font-bold text-foreground">السنة / المرحلة
            <select name="stageId" defaultValue={params.stageId ?? ''} className="rounded-xl border border-border bg-background px-4 py-3 font-normal text-foreground outline-none focus:border-gold-deep dark:border-border dark:bg-ink-base dark:text-foreground">
              <option value="">كل السنوات</option>
              {stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.title}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-bold text-foreground">الفرع
            <select name="branchId" defaultValue={params.branchId ?? ''} className="rounded-xl border border-border bg-background px-4 py-3 font-normal text-foreground outline-none focus:border-gold-deep dark:border-border dark:bg-ink-base dark:text-foreground">
              <option value="">كل الفروع</option>
              {stages.flatMap((stage) => stage.branches.map((branch) => <option key={branch.id} value={branch.id}>{stage.title} — {branch.title}</option>))}
            </select>
          </label>
          <div className="flex items-end sm:col-span-2"><button type="submit" className="w-full rounded-full bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground transition hover:bg-primary-deep">عرض الخطط المناسبة</button></div>
        </form>

        <div className="mt-10 flex items-center justify-between gap-4">
          <div><h2 className="font-heading text-2xl font-extrabold text-foreground">{selectedBranch ? `خطط ${selectedBranch.title}` : selectedStage ? `خطط ${selectedStage.title}` : 'كل الخطط المتاحة'}</h2><p className="mt-1 text-sm text-foreground-soft dark:text-muted-foreground">{plans.length ? `وجدنا ${plans.length} خطة اشتراك مطابقة لاختيارك.` : 'لا توجد خطط عامة مطابقة لهذا الاختيار حاليًا.'}</p></div>
          {(params.stageId || params.branchId) && <Link href="/subscriptions" className="text-sm font-bold text-emerald-deep hover:underline dark:text-teal-glow">مسح الاختيار</Link>}
        </div>

        {plans.length > 0 ? <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{plans.map((plan) => <Link key={plan.id} href={`/subscriptions/${plan.id}`} className="group overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-sm transition hover:-translate-y-1 hover:shadow-xl dark:border-border dark:bg-card"><div className="relative h-44 bg-gradient-to-br from-primary/10 to-gold/10 dark:from-primary/20 dark:to-teal-glow/10">{plan.imageUrl ? <Image src={plan.imageUrl} alt={plan.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" /> : <div className="grid h-full place-items-center font-heading text-2xl font-extrabold text-primary/35">اشتراك</div>}{plan.featured && <span className="absolute right-4 top-4 rounded-full bg-gold px-3 py-1 text-xs font-bold text-foreground">مميز</span>}</div><div className="p-5"><div className="text-xs font-bold text-gold-deep dark:text-teal-glow">{plan.marketingLabel ?? plan.scopeLabel}</div><h3 className="mt-2 font-heading text-xl font-extrabold text-foreground">{plan.title}</h3><p className="mt-2 line-clamp-2 text-sm leading-7 text-foreground-soft dark:text-muted-foreground">{plan.shortDescription || plan.description}</p><div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-foreground-soft dark:text-muted-foreground"><span className="rounded-lg bg-muted px-3 py-2"><CheckCircle2 className="ml-1 inline size-3.5 text-emerald-deep" />{plan.scopeLabel}</span><span className="rounded-lg bg-muted px-3 py-2">{periodLabel(plan.billingPeriod, plan.durationDays)}</span></div><div className="mt-5 flex items-center justify-between border-t border-border pt-4"><span className="font-heading text-2xl font-extrabold text-foreground">{formatMoney(plan.price)} <small className="text-xs font-normal">ج.م</small></span><span className="inline-flex items-center gap-1 text-sm font-bold text-emerald-deep dark:text-teal-glow">التفاصيل <ArrowLeft className="size-4 transition group-hover:-translate-x-1" /></span></div></div></Link>)}</div> : <div className="mt-6 rounded-[1.75rem] border border-dashed border-border bg-card p-12 text-center text-foreground-soft dark:border-border dark:bg-card dark:text-muted-foreground">جرّب اختيار سنة أو فرع آخر، أو تواصل مع المدرس لمعرفة الخطط المتاحة.</div>}
      </div>
    </main>
  )
}

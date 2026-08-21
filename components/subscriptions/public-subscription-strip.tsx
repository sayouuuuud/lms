import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, Sparkles } from 'lucide-react'
import type { PublicSubscriptionPlan } from '@/lib/subscription-public'

function formatMoney(value: number) {
  return new Intl.NumberFormat('ar-EG').format(value)
}

function periodLabel(period: string, days: number) {
  if (period === 'month') return 'شهري'
  if (period === 'term') return 'اشتراك ترم'
  if (period === 'year') return 'سنوي'
  return `${days} يومًا`
}

export function PublicSubscriptionStrip({
  plans,
  title = 'اشتراكات تغطي المحتوى الذي تحتاجه',
  subtitle = 'بدل شراء كل محتوى على حدة، اختر خطة مناسبة وافتح نطاقها طوال مدة الاشتراك.',
}: {
  plans: PublicSubscriptionPlan[]
  title?: string
  subtitle?: string
}) {
  if (!plans.length) return null
  return (
    <section className="relative mx-auto max-w-7xl px-4 py-8 sm:px-5 md:px-8" dir="rtl">
      <div className="overflow-hidden rounded-[2rem] border border-gold/30 bg-gradient-to-l from-primary via-primary/95 to-[#24304f] p-5 text-primary-foreground shadow-xl shadow-navy/15 sm:p-7">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold text-gold dark:text-teal-glow"><Sparkles className="size-3.5" />خطط اشتراك متاحة</span>
            <h2 className="mt-3 font-heading text-2xl font-extrabold sm:text-3xl">{title}</h2>
            <p className="mt-2 text-sm leading-7 text-primary-foreground/75 sm:text-base">{subtitle}</p>
          </div>
          <div className="grid w-full gap-3 sm:grid-cols-2 lg:max-w-3xl lg:grid-cols-3">
            {plans.slice(0, 3).map((plan) => (
              <Link key={plan.id} href={`/subscriptions/${plan.id}`} className="group overflow-hidden rounded-2xl border border-white/15 bg-white/10 transition hover:-translate-y-1 hover:bg-white/15">
                {plan.imageUrl ? <div className="relative h-24 w-full"><Image src={plan.imageUrl} alt={plan.title} fill className="object-cover" sizes="320px" /></div> : <div className="h-2 bg-gold dark:bg-teal-glow" />}
                <div className="p-4">
                  {plan.marketingLabel && <div className="text-[11px] font-bold text-gold dark:text-teal-glow">{plan.marketingLabel}</div>}
                  <h3 className="mt-1 line-clamp-2 font-heading text-base font-bold">{plan.title}</h3>
                  <div className="mt-2 text-xs text-primary-foreground/70">{plan.scopeLabel} · {periodLabel(plan.billingPeriod, plan.durationDays)}</div>
                  <div className="mt-3 flex items-center justify-between gap-2"><span className="font-heading text-lg font-extrabold">{formatMoney(plan.price)} <small className="text-xs font-normal">ج.م</small></span><ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" /></div>
                </div>
              </Link>
            ))}
          </div>
        </div>
        {plans.length > 3 && <Link href="/subscriptions" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-gold hover:underline dark:text-teal-glow">عرض كل الاشتراكات <ArrowLeft className="size-4" /></Link>}
      </div>
    </section>
  )
}

import Link from 'next/link'
import { getSubscriptionPlanDetailAction, getSubscriptionScopeOptionsAction } from '../actions'
import SubscriptionPlanDetailClient from './client'

export default async function SubscriptionPlanDetailPage({ params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params
  const [planResult, optionsResult] = await Promise.all([
    getSubscriptionPlanDetailAction(planId),
    getSubscriptionScopeOptionsAction(),
  ])

  if (!planResult.ok || !optionsResult.ok) {
    return (
      <div className="space-y-4 p-6" dir="rtl">
        <Link href="/admin/subscriptions" className="text-sm text-primary hover:underline">العودة إلى مدير الاشتراكات</Link>
        <h1 className="text-2xl font-bold">تفاصيل خطة الاشتراك</h1>
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{!planResult.ok ? planResult.error : optionsResult.error}</div>
      </div>
    )
  }

  return <SubscriptionPlanDetailClient initialPlan={planResult.plan} options={optionsResult.options} />
}

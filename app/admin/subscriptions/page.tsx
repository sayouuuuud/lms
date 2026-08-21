import { getSubscriptionManagerDataAction } from './actions'
import SubscriptionsClient from './client'

export default async function SubscriptionsPage() {
  const result = await getSubscriptionManagerDataAction({ page: 1, pageSize: 25 })

  if (!result.ok) {
    return (
      <div className="space-y-4 p-6" dir="rtl">
        <h1 className="text-2xl font-bold">إدارة الاشتراكات</h1>
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{result.error}</div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6" dir="rtl">
      <div>
        <p className="text-sm font-medium text-primary">مركز الحوكمة التجارية</p>
        <h1 className="text-2xl font-bold tracking-tight">إدارة الاشتراكات</h1>
        <p className="mt-1 text-sm text-muted-foreground">تحكم في الخطط، نطاق الوصول، الحالات، التحصيل، والإسناد اليدوي دون المساس بالمشتريات الفردية.</p>
      </div>
      <SubscriptionsClient initialData={result.data} />
    </div>
  )
}

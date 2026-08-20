import { getSubscriptionData } from "./actions"
import SubscriptionsClient from "./client"

export default async function SubscriptionsPage() {
  const data = await getSubscriptionData()

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">إدارة الاشتراكات (Subscriptions Manager)</h1>
      <SubscriptionsClient 
        initialPlans={data.plans} 
        settings={data.settings} 
      />
    </div>
  )
}

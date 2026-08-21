import { AssignSubscriptionClient } from "./client"

export const metadata = {
  title: "Assign Subscription",
}

export default function AssignSubscriptionPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">إسناد اشتراك لطالب</h1>
      <AssignSubscriptionClient />
    </div>
  )
}

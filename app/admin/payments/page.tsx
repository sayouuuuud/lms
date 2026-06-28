import { OrdersManager } from '@/components/payments/orders-manager'
import { getOrders } from './orders-actions'

export default async function PaymentsPage() {
  const orders = await getOrders()

  return (
    <div className="space-y-6">
      <div className="text-right">
        <h2 className="text-2xl font-bold text-foreground">الطلبات</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          مراجعة طلبات الاشتراك المرسلة من الطلاب، واتخاذ قرار القبول أو الرفض، والتواصل مع الطالب
        </p>
      </div>
      <OrdersManager initialOrders={orders} />
    </div>
  )
}

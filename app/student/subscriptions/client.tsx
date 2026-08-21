"use client"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

export function StudentSubscriptionsClient({ mySubscriptions, availablePlans }: { mySubscriptions: any[], availablePlans: any[] }) {
  const handleSubscribeClick = () => {
    toast.info("يرجى التواصل مع الإدارة عبر الواتساب لتفعيل هذه الباقة", { duration: 5000 })
  }

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('ar-EG', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }).format(new Date(dateString))
  }

  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-xl font-bold mb-4">اشتراكاتي الحالية</h2>
        {mySubscriptions.length === 0 ? (
          <div className="text-muted-foreground bg-muted p-6 rounded-lg text-center">
            ليس لديك أي اشتراكات فعالة حالياً.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mySubscriptions.map(sub => (
              <Card key={sub.id} className="border-primary ring-1 ring-primary/20">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{sub.plans.title}</CardTitle>
                    <Badge variant="default">فعال</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-sm">
                    <span className="text-muted-foreground">تاريخ البدء: </span>
                    <span className="font-medium">{formatDate(sub.start_date)}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">تاريخ الانتهاء: </span>
                    <span className="font-medium">{formatDate(sub.end_date)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4">الباقات المتاحة</h2>
        {availablePlans.length === 0 ? (
          <div className="text-muted-foreground">
            لا توجد باقات متاحة حالياً.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availablePlans.map(plan => (
              <Card key={plan.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle>{plan.title}</CardTitle>
                  <div className="text-2xl font-bold mt-2 text-primary">{plan.price} ج.م</div>
                </CardHeader>
                <CardContent className="flex-1 space-y-4">
                  <div className="text-sm text-muted-foreground line-clamp-3">
                    {plan.description || "لا يوجد وصف."}
                  </div>
                  <div className="text-sm font-medium">
                    المدة: {plan.duration_days} يوم
                  </div>
                </CardContent>
                <CardFooter>
                  <Button className="w-full" onClick={handleSubscribeClick}>
                    اشتراك
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

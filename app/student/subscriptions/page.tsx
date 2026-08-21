import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { StudentSubscriptionsClient } from "./client"

export const metadata = {
  title: "اشتراكاتي",
}

export default async function StudentSubscriptionsPage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/login')
  }

  const student = await prisma.students.findFirst({
    where: { user_id: session.user.id }
  })

  if (!student) {
    return <div className="p-6">لم يتم العثور على بيانات الطالب</div>
  }

  const mySubscriptions = await prisma.student_subscriptions.findMany({
    where: { 
      student_id: student.id,
      status: 'active'
    },
    include: {
      plans: true
    },
    orderBy: { start_date: 'desc' }
  })

  const availablePlans = await prisma.subscription_plans.findMany({
    where: { is_active: true },
    orderBy: { created_at: 'desc' }
  })

  const mySubs = mySubscriptions.map(sub => ({
    ...sub,
    start_date: sub.start_date.toISOString(),
    end_date: sub.end_date.toISOString(),
    created_at: sub.created_at.toISOString(),
    updated_at: sub.updated_at.toISOString(),
    plans: {
      ...sub.plans,
      price: Number(sub.plans.price),
      created_at: sub.plans.created_at.toISOString(),
      updated_at: sub.plans.updated_at.toISOString(),
    }
  }))

  const plans = availablePlans.map(plan => ({
    ...plan,
    price: Number(plan.price),
    created_at: plan.created_at.toISOString(),
    updated_at: plan.updated_at.toISOString(),
  }))

  return (
    <div className="p-4 md:p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">إدارة الاشتراكات</h1>
        <p className="text-muted-foreground mt-1">تصفح باقات الاشتراك المتاحة وحالة اشتراكك الحالي</p>
      </div>
      <StudentSubscriptionsClient 
        mySubscriptions={mySubs} 
        availablePlans={plans} 
      />
    </div>
  )
}

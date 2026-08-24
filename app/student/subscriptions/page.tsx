import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { getPublicSubscriptionContext, getVisiblePlans } from "@/lib/subscription-public"
import { StudentSubscriptionsClient } from "./client"

export const metadata = {
  title: "اشتراكاتي",
}

export default async function StudentSubscriptionsPage({
  searchParams,
}: {
  searchParams?: Promise<{ planId?: string }>
}) {
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

  const ctx = await getPublicSubscriptionContext()
  // الاستعلام المرجعي الوحيد لعرض الخطط (is_active + public_visible مع النطاقات).
  const visiblePlans = await getVisiblePlans()

  // purchases_only: لا تسويق لباقات جديدة، والاشتراكات القائمة تظهر موسومة كغير مفعّلة.
  const availablePlans = ctx.subscriptionsEnabled ? visiblePlans : []

  // planId قادم من صفحة الخطة العامة أو التسجيل — يُتجاهل بصمت إن لم يكن ضمن الخطط الظاهرة.
  const params = await searchParams
  let preselectedPlanId: string | null = null
  if (params?.planId && availablePlans.some((plan) => plan.id === params.planId)) {
    preselectedPlanId = params.planId
  }

  const now = new Date()
  const mySubscriptions = await prisma.student_subscriptions.findMany({
    where: {
      student_id: student.id,
      status: { in: ['active', 'grace'] },
      end_date: { gt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
    },
    include: { plans: true },
    orderBy: { start_date: 'desc' }
  })

  const myRequests = await prisma.subscription_requests.findMany({
    where: { student_id: session.user.id, status: { in: ['pending', 'approved', 'rejected'] } },
    orderBy: { created_at: 'desc' },
    take: 10,
    select: {
      id: true, code: true, status: true, plan_title: true, created_at: true,
      reviewed_at: true, admin_note: true,
    },
  })

  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
  const mySubs = mySubscriptions.map(sub => {
    const graceActive = !!sub.grace_until && sub.grace_until.getTime() >= now.getTime()
    const ended = sub.end_date.getTime() < now.getTime()
    const nearExpiry = !ended && sub.end_date.getTime() - now.getTime() <= sevenDaysMs
    const state: 'active' | 'grace' | 'expiring' | 'ended' = graceActive ? 'grace' : ended ? 'ended' : nearExpiry ? 'expiring' : 'active'
    // ما اشتراه الطالب فعلًا يُشتق من اللقطة المجمدة وقت الإسناد — لا من الخطة الحية.
    const snapshot = (sub.plan_snapshot ?? null) as { title?: string; durationDays?: number } | null
    return {
      id: sub.id,
      planId: sub.plan_id,
      planTitle: sub.plans.title,
      price: Number(sub.plans.price),
      durationDays: sub.plans.duration_days,
      state,
      graceDaysLeft: graceActive && sub.grace_until
        ? Math.max(0, Math.ceil((sub.grace_until.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)))
        : null,
      snapshotTitle: snapshot?.title ?? null,
      snapshotDurationDays: typeof snapshot?.durationDays === 'number' ? snapshot.durationDays : null,
      startDate: sub.start_date.toISOString(),
      endDate: sub.end_date.toISOString(),
    }
  })

  const requests = myRequests.map(req => ({
    id: req.id,
    code: req.code,
    status: req.status as 'pending' | 'approved' | 'rejected',
    planTitle: req.plan_title,
    createdAt: req.created_at.toISOString(),
    adminNote: req.admin_note,
  }))

  return (
    <div className="p-4 md:p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">اشتراكاتي</h1>
        <p className="text-muted-foreground mt-1">تصفح باقات الاشتراك المتاحة وحالة اشتراكك الحالي</p>
      </div>
      <StudentSubscriptionsClient
        mySubscriptions={mySubs}
        availablePlans={availablePlans}
        requests={requests}
        preselectedPlanId={preselectedPlanId}
        subscriptionsEnabled={ctx.subscriptionsEnabled}
      />
    </div>
  )
}

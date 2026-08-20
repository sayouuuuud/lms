import { prisma } from './prisma'

export async function hasActiveSubscription(userId: string): Promise<boolean> {
  const settings = await prisma.platform_settings.findFirst()
  const mode = settings?.subscription_mode || 'purchases_only'
  if (mode === 'purchases_only') return false

  const student = await prisma.students.findFirst({
    where: { user_id: userId },
    select: { id: true }
  })
  
  if (!student) return false

  // check active subscription
  // taking grace period into account
  const graceDays = settings?.grace_period_days || 3
  
  const graceDate = new Date()
  graceDate.setDate(graceDate.getDate() - graceDays)

  const activeSub = await prisma.student_subscriptions.findFirst({
    where: {
      student_id: student.id,
      status: 'active',
      end_date: { gte: graceDate }
    }
  })

  return !!activeSub
}

export const isReleasedFilter = {
  is_published: true,
  OR: [
    { release_date: null },
    { release_date: { lte: new Date() } }
  ]
}

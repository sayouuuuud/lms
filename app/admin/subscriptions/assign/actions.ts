"use server"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function searchStudents(query: string) {
  if (!query) return []
  return await prisma.students.findMany({
    where: {
      OR: [
        { name: { contains: query } },
        { code: { contains: query } },
        { phone: { contains: query } },
      ]
    },
    take: 10,
    select: { id: true, name: true, code: true, phone: true }
  })
}

export async function getActivePlans() {
  const plans = await prisma.subscription_plans.findMany({
    where: { is_active: true },
    orderBy: { created_at: 'desc' },
    select: { id: true, title: true, price: true, duration_days: true }
  })
  return plans.map(p => ({ ...p, price: Number(p.price) }))
}

export async function assignSubscriptionToStudent(studentId: string, planId: string) {
  const plan = await prisma.subscription_plans.findUnique({ where: { id: planId } })
  if (!plan) throw new Error("Plan not found")

  const startDate = new Date()
  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + plan.duration_days)

  await prisma.student_subscriptions.create({
    data: {
      student_id: studentId,
      plan_id: planId,
      start_date: startDate,
      end_date: endDate,
      status: "active"
    }
  })

  revalidatePath('/admin/subscriptions/assign')
  return { success: true }
}

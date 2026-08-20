"use server"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function getSubscriptionData() {
  const plansData = await prisma.subscription_plans.findMany({ orderBy: { created_at: 'desc' } })
  const settings = await prisma.platform_settings.findUnique({ where: { id: 1 } })
  
  const plans = plansData.map(plan => ({
    ...plan,
    price: Number(plan.price)
  }))

  return { plans, settings }
}

export async function createPlan(data: { title: string, description: string, price: number, duration_days: number }) {
  await prisma.subscription_plans.create({ data: { ...data, is_active: true } })
  revalidatePath('/admin/subscriptions')
}

export async function togglePlanActive(id: string, is_active: boolean) {
  await prisma.subscription_plans.update({ where: { id }, data: { is_active } })
  revalidatePath('/admin/subscriptions')
}

export async function updateSettings(subscription_mode: string, grace_period_days: number) {
  await prisma.platform_settings.update({
    where: { id: 1 },
    data: { subscription_mode, grace_period_days }
  })
  revalidatePath('/admin/subscriptions')
}

import { prisma } from '@/lib/prisma'
import { normalizeSubscriptionMode, type SubscriptionMode } from '@/lib/subscription-rules'

export type PublicSubscriptionPlan = {
  id: string
  title: string
  description: string
  marketingLabel: string | null
  shortDescription: string
  imageUrl: string | null
  price: number
  durationDays: number
  billingPeriod: string
  scopeMode: string
  scopeLabel: string
  featured: boolean
  scopes: Array<{ scopeType: string; scopeId: string | null }>
}

const planPresentation = {
  id: true,
  title: true,
  description: true,
  marketing_label: true,
  short_description: true,
  image_url: true,
  price: true,
  duration_days: true,
  billing_period: true,
  scope_mode: true,
  featured: true,
  scopes: { select: { scope_type: true, scope_id: true } },
} as const

function scopeLabel(plan: { scope_mode: string; scopes: Array<{ scope_type: string; scope_id: string | null }> }) {
  if (plan.scope_mode === 'all_released' && plan.scopes.length === 0) return 'كل المحتوى المنشور'
  const types = new Set(plan.scopes.map((scope) => scope.scope_type))
  if (types.has('branch')) return types.size > 1 ? 'فروع ومحتوى محدد' : 'فرع محدد'
  if (types.has('stage')) return 'مرحلة دراسية محددة'
  if (types.has('term')) return 'ترم محدد'
  if (types.has('course')) return 'كورسات محددة'
  if (types.has('lecture')) return 'محاضرات محددة'
  return 'محتوى محدد'
}

function serialize(plan: any): PublicSubscriptionPlan {
  return {
    id: plan.id,
    title: plan.title,
    description: plan.description ?? '',
    marketingLabel: plan.marketing_label ?? null,
    shortDescription: plan.short_description ?? '',
    imageUrl: plan.image_url ?? null,
    price: Number(plan.price),
    durationDays: plan.duration_days,
    billingPeriod: plan.billing_period,
    scopeMode: plan.scope_mode,
    scopeLabel: scopeLabel(plan),
    featured: Boolean(plan.featured),
    scopes: plan.scopes.map((scope: any) => ({ scopeType: scope.scope_type, scopeId: scope.scope_id })),
  }
}

export async function getPublicSubscriptionPlans(input: {
  stageId?: string
  branchId?: string
  branchIds?: string[]
  featuredOnly?: boolean
  context?: 'home' | 'stage' | 'branch'
} = {}): Promise<PublicSubscriptionPlan[]> {
  const branchIds = input.branchIds ?? (input.branchId ? [input.branchId] : [])
  const scopeOr: any[] = [{ scope_mode: 'all_released', scopes: { none: {} } }]
  if (input.stageId) scopeOr.push({ scopes: { some: { scope_type: 'stage', scope_id: input.stageId } } })
  if (branchIds.length) scopeOr.push({ scopes: { some: { scope_type: 'branch', scope_id: { in: branchIds } } } })

  const plans = await prisma.subscription_plans.findMany({
    where: {
      is_active: true,
      public_visible: true,
      ...(input.featuredOnly ? { featured: true } : {}),
      ...(input.context === 'home' || (!input.stageId && !input.branchId) ? {} : { OR: scopeOr }),
    },
    orderBy: [{ featured: 'desc' }, { sort_order: 'asc' }, { created_at: 'desc' }],
    select: planPresentation,
  })

  const filtered = input.context === 'stage' && branchIds.length > 0
    ? plans.filter((plan) => {
        if (plan.scope_mode === 'all_released' && plan.scopes.length === 0) return true
        if (plan.scopes.some((scope) => scope.scope_type === 'stage' && scope.scope_id === input.stageId)) return true
        const scopedBranches = new Set(plan.scopes.filter((scope) => scope.scope_type === 'branch').map((scope) => scope.scope_id))
        return branchIds.every((branchId) => scopedBranches.has(branchId))
      })
    : plans

  return filtered.map(serialize)
}

export async function getPublicSubscriptionPlan(planId: string): Promise<PublicSubscriptionPlan | null> {
  const plan = await prisma.subscription_plans.findFirst({
    where: { id: planId, is_active: true, public_visible: true },
    select: planPresentation,
  })
  return plan ? serialize(plan) : null
}

/**
 * وضع الاشتراكات للأسطح العامة: يحدد ما إذا كان تسويق الخطط والاشتراك ظاهرًا إطلاقًا.
 * purchases_only => subscriptionsEnabled=false وتُخفى كل عناصر التسويق.
 */
export async function getPublicSubscriptionContext(): Promise<{
  mode: SubscriptionMode
  subscriptionsEnabled: boolean
}> {
  const settings = await prisma.platform_settings.findFirst({ select: { subscription_mode: true } })
  const mode = normalizeSubscriptionMode(settings?.subscription_mode)
  return { mode, subscriptionsEnabled: mode !== 'purchases_only' }
}

/**
 * الاستعلام المرجعي الوحيد لعرض الخطط للطلاب/الزوار خارج الصفحات الإدارية:
 * is_active + public_visible مع النطاقات. أي عرض خطة جديد يستدعي هذه الدالة
 * بدل استعلام مباشر (يمنع تسرّب خطط مخفية أو مؤرشفة).
 */
export async function getVisiblePlans(): Promise<PublicSubscriptionPlan[]> {
  const plans = await prisma.subscription_plans.findMany({
    where: { is_active: true, public_visible: true },
    orderBy: [{ featured: 'desc' }, { sort_order: 'asc' }, { created_at: 'desc' }],
    select: planPresentation,
  })
  return plans.map(serialize)
}

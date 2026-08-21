'use server'

import { auth } from '@/auth'
import { hasResourceAccess } from '@/lib/auth-guard'
import { logActivity } from '@/lib/audit-log'
import {
  assignSubscription,
  createSubscriptionPlan,
  getSubscriptionEvents,
  getSubscriptionManagerData,
  getSubscriptionPlanDetail,
  getSubscriptionScopeOptions,
  setPlanActive,
  setSubscriptionMode,
  renewSubscription,
  transitionSubscription,
  updateSubscriptionPlan,
  type PlanInput,
  type SubscriptionManagerFilters,
  type SubscriptionStatus,
} from '@/lib/subscription-manager'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

async function requireSubscriptionManager() {
  const allowed = await hasResourceAccess('subscriptions', 'manage')
  if (!allowed) throw new Error('ليس لديك صلاحية إدارة الاشتراكات')
  const session = await auth()
  const actorId = session?.user?.id
  if (!actorId) throw new Error('يجب تسجيل الدخول')
  return actorId
}

function failMessage(error: unknown) {
  return error instanceof Error ? error.message : 'تعذر تنفيذ العملية'
}

export async function getSubscriptionManagerDataAction(filters: SubscriptionManagerFilters = {}) {
  try {
    await requireSubscriptionManager()
    return { ok: true as const, data: await getSubscriptionManagerData(filters) }
  } catch (error) {
    return { ok: false as const, error: failMessage(error) }
  }
}

export async function createSubscriptionPlanAction(input: PlanInput) {
  try {
    const actorId = await requireSubscriptionManager()
    const id = await createSubscriptionPlan(input, actorId)
    await logActivity({ action: 'create', resource: 'subscriptions', targetId: id, targetLabel: input.title, details: 'إنشاء خطة اشتراك' })
    revalidatePath('/admin/subscriptions')
    return { ok: true as const, id }
  } catch (error) {
    return { ok: false as const, error: failMessage(error) }
  }
}

export async function updateSubscriptionPlanAction(planId: string, input: PlanInput) {
  try {
    const actorId = await requireSubscriptionManager()
    await updateSubscriptionPlan(planId, input, actorId)
    await logActivity({ action: 'update', resource: 'subscriptions', targetId: planId, targetLabel: input.title, details: 'تعديل خطة اشتراك ونطاقاتها' })
    revalidatePath('/admin/subscriptions')
    revalidatePath(`/admin/subscriptions/${planId}`)
    return { ok: true as const }
  } catch (error) {
    return { ok: false as const, error: failMessage(error) }
  }
}

export async function setPlanActiveAction(planId: string, isActive: boolean) {
  try {
    const actorId = await requireSubscriptionManager()
    await setPlanActive(planId, isActive, actorId)
    await logActivity({ action: 'update', resource: 'subscriptions', targetId: planId, details: isActive ? 'تفعيل خطة اشتراك' : 'أرشفة خطة اشتراك' })
    revalidatePath('/admin/subscriptions')
    return { ok: true as const }
  } catch (error) {
    return { ok: false as const, error: failMessage(error) }
  }
}

export async function setSubscriptionModeAction(mode: string, gracePeriodDays: number) {
  try {
    const actorId = await requireSubscriptionManager()
    await setSubscriptionMode(mode, gracePeriodDays, actorId)
    await logActivity({ action: 'update', resource: 'subscriptions', targetLabel: 'إعدادات الاشتراكات', details: `تغيير وضع الاشتراكات إلى ${mode} وفترة السماح ${gracePeriodDays} يومًا` })
    revalidatePath('/admin/subscriptions')
    return { ok: true as const }
  } catch (error) {
    return { ok: false as const, error: failMessage(error) }
  }
}

export async function assignSubscriptionAction(input: {
  studentId: string
  planId: string
  source?: string
  paymentStatus?: string
  paymentReference?: string | null
  startDate?: string
  endDate?: string
  graceUntil?: string | null
}) {
  try {
    const actorId = await requireSubscriptionManager()
    const result = await assignSubscription({
      ...input,
      actorId,
      startDate: input.startDate ? new Date(input.startDate) : undefined,
      endDate: input.endDate ? new Date(input.endDate) : undefined,
      graceUntil: input.graceUntil ? new Date(input.graceUntil) : null,
    })
    await logActivity({ action: 'create', resource: 'subscriptions', targetId: result.id, targetLabel: `${result.studentName} — ${result.planTitle}`, details: 'إسناد اشتراك لطالب' })
    revalidatePath('/admin/subscriptions')
    return { ok: true as const, result }
  } catch (error) {
    return { ok: false as const, error: failMessage(error) }
  }
}

export async function renewSubscriptionAction(input: {
  subscriptionId: string
  durationDays?: number
  paymentStatus?: string
  paymentReference?: string | null
  reason?: string
}) {
  try {
    const actorId = await requireSubscriptionManager()
    const result = await renewSubscription({ ...input, actorId })
    await logActivity({ action: 'update', resource: 'subscriptions', targetId: input.subscriptionId, targetLabel: result.planTitle, details: `تجديد الاشتراك حتى ${result.endDate}` })
    revalidatePath('/admin/subscriptions')
    return { ok: true as const, result }
  } catch (error) {
    return { ok: false as const, error: failMessage(error) }
  }
}

export async function transitionSubscriptionAction(input: {
  subscriptionId: string
  toStatus: SubscriptionStatus
  reason?: string
  graceUntil?: string | null
  paymentStatus?: string
  paymentReference?: string | null
  nextBillingAt?: string | null
}) {
  try {
    const actorId = await requireSubscriptionManager()
    await transitionSubscription({
      ...input,
      graceUntil: input.graceUntil === undefined ? undefined : input.graceUntil ? new Date(input.graceUntil) : null,
      nextBillingAt: input.nextBillingAt === undefined ? undefined : input.nextBillingAt ? new Date(input.nextBillingAt) : null,
    }, actorId)
    await logActivity({ action: 'update', resource: 'subscriptions', targetId: input.subscriptionId, details: `انتقال حالة الاشتراك إلى ${input.toStatus}` })
    revalidatePath('/admin/subscriptions')
    return { ok: true as const }
  } catch (error) {
    return { ok: false as const, error: failMessage(error) }
  }
}

export async function getSubscriptionPlanDetailAction(planId: string) {
  try {
    await requireSubscriptionManager()
    const plan = await getSubscriptionPlanDetail(planId)
    if (!plan) return { ok: false as const, error: 'الخطة غير موجودة' }
    return { ok: true as const, plan }
  } catch (error) {
    return { ok: false as const, error: failMessage(error) }
  }
}

export async function getSubscriptionScopeOptionsAction() {
  try {
    await requireSubscriptionManager()
    return { ok: true as const, options: await getSubscriptionScopeOptions() }
  } catch (error) {
    return { ok: false as const, error: failMessage(error) }
  }
}

export async function getSubscriptionEventsAction(subscriptionId: string) {
  try {
    await requireSubscriptionManager()
    return { ok: true as const, events: await getSubscriptionEvents(subscriptionId) }
  } catch (error) {
    return { ok: false as const, error: failMessage(error) }
  }
}

// توافق مؤقت مع الاستدعاءات القديمة إلى أن تُستبدل الواجهة بالكامل.
export async function getSubscriptionData() {
  const result = await getSubscriptionManagerDataAction()
  return result.ok ? result.data : { plans: [], subscriptions: [], stats: null, settings: null, pagination: null, error: result.error }
}

export async function createPlan(input: PlanInput) {
  return createSubscriptionPlanAction(input)
}

export async function togglePlanActive(planId: string, isActive: boolean) {
  return setPlanActiveAction(planId, isActive)
}

export async function updateSettings(mode: string, gracePeriodDays: number) {
  return setSubscriptionModeAction(mode, gracePeriodDays)
}

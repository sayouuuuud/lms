import 'server-only'

import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export const SUBSCRIPTION_STATUSES = ['active', 'grace', 'expired', 'cancelled', 'suspended'] as const
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number]

export const SUBSCRIPTION_EVENT_TYPES = [
  'created',
  'renewed',
  'payment_recorded',
  'grace_started',
  'expired',
  'cancelled',
  'suspended',
  'resumed',
  'updated',
] as const
export type SubscriptionEventType = (typeof SUBSCRIPTION_EVENT_TYPES)[number]

export type SubscriptionManagerFilters = {
  query?: string
  status?: SubscriptionStatus | 'all'
  planId?: string
  page?: number
  pageSize?: number
}

export type PlanInput = {
  title: string
  description?: string
  price: number
  durationDays: number
  billingPeriod: string
  scopeMode: string
  allowManualAssignment: boolean
  isActive: boolean
  code?: string
  stageId?: string | null
  branchId?: string | null
  scopes?: Array<{ scopeType: string; scopeId?: string | null }>
}

export type SubscriptionTransitionInput = {
  subscriptionId: string
  toStatus: SubscriptionStatus
  reason?: string
  graceUntil?: Date | null
  paymentStatus?: string
  paymentReference?: string | null
  nextBillingAt?: Date | null
}

function cleanText(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback
}

function finiteNumber(value: unknown, fallback = 0): number {
  const number = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(number) ? number : fallback
}

function assertPlanInput(input: PlanInput) {
  const title = cleanText(input.title)
  if (title.length < 2 || title.length > 120) throw new Error('اسم الخطة يجب أن يكون بين حرفين و120 حرفًا')
  const price = finiteNumber(input.price, -1)
  if (price < 0) throw new Error('سعر الخطة غير صالح')
  const durationDays = Math.floor(finiteNumber(input.durationDays, 0))
  if (durationDays < 1 || durationDays > 3650) throw new Error('مدة الخطة يجب أن تكون بين يوم و3650 يومًا')
  const scopeMode = cleanText(input.scopeMode, 'all_released')
  if (!['all_released', 'selected'].includes(scopeMode)) throw new Error('نطاق الخطة غير صالح')
  if ((input.scopes ?? []).some((scope) => !cleanText(scope.scopeType) || (scope.scopeType !== 'all_released' && !scope.scopeId))) {
    throw new Error('يوجد نطاق اشتراك غير مكتمل')
  }
  if (scopeMode === 'selected' && (input.scopes ?? []).length === 0 && !input.stageId && !input.branchId) {
    throw new Error('الخطة المحددة يجب أن تحتوي على نطاق واحد على الأقل')
  }
}

function serializeDate(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null
}

function serializePlan(plan: any) {
  return {
    id: plan.id,
    code: plan.code,
    title: plan.title,
    description: plan.description,
    price: Number(plan.price),
    durationDays: plan.duration_days,
    billingPeriod: plan.billing_period,
    scopeMode: plan.scope_mode,
    allowManualAssignment: plan.allow_manual_assignment,
    isActive: plan.is_active,
    archivedAt: serializeDate(plan.archived_at),
    stageId: plan.stage_id,
    branchId: plan.branch_id,
    createdAt: serializeDate(plan.created_at),
    updatedAt: serializeDate(plan.updated_at),
    subscriberCount: plan._count?.student_subscriptions ?? 0,
    scopes: (plan.scopes ?? []).map((scope: any) => ({
      id: scope.id,
      scopeType: scope.scope_type,
      scopeId: scope.scope_id,
      createdAt: serializeDate(scope.created_at),
    })),
  }
}

function serializeSubscription(subscription: any) {
  return {
    id: subscription.id,
    status: subscription.status,
    source: subscription.source,
    paymentStatus: subscription.payment_status,
    paymentReference: subscription.payment_reference,
    startDate: serializeDate(subscription.start_date),
    endDate: serializeDate(subscription.end_date),
    graceUntil: serializeDate(subscription.grace_until),
    cancelledAt: serializeDate(subscription.cancelled_at),
    cancelReason: subscription.cancel_reason,
    suspendedAt: serializeDate(subscription.suspended_at),
    suspendReason: subscription.suspend_reason,
    assignedBy: subscription.assigned_by,
    updatedBy: subscription.updated_by,
    lastPaymentAt: serializeDate(subscription.last_payment_at),
    nextBillingAt: serializeDate(subscription.next_billing_at),
    createdAt: serializeDate(subscription.created_at),
    updatedAt: serializeDate(subscription.updated_at),
    student: subscription.students
      ? {
          id: subscription.students.id,
          name: subscription.students.name,
          code: subscription.students.code,
          email: subscription.students.email,
          phone: subscription.students.phone,
        }
      : null,
    plan: subscription.plans ? serializePlan(subscription.plans) : null,
  }
}

const planSelect = {
  id: true,
  code: true,
  title: true,
  description: true,
  price: true,
  duration_days: true,
  billing_period: true,
  scope_mode: true,
  allow_manual_assignment: true,
  is_active: true,
  archived_at: true,
  stage_id: true,
  branch_id: true,
  created_at: true,
  updated_at: true,
  scopes: { orderBy: { created_at: 'asc' as const } },
  _count: { select: { student_subscriptions: true } },
}

const subscriptionSelect = {
  id: true,
  status: true,
  source: true,
  payment_status: true,
  payment_reference: true,
  start_date: true,
  end_date: true,
  grace_until: true,
  cancelled_at: true,
  cancel_reason: true,
  suspended_at: true,
  suspend_reason: true,
  assigned_by: true,
  updated_by: true,
  last_payment_at: true,
  next_billing_at: true,
  created_at: true,
  updated_at: true,
  students: { select: { id: true, name: true, code: true, email: true, phone: true } },
  plans: { select: planSelect },
}

export async function getSubscriptionManagerData(filters: SubscriptionManagerFilters = {}) {
  const page = Math.max(1, Math.floor(filters.page ?? 1))
  const pageSize = Math.min(100, Math.max(10, Math.floor(filters.pageSize ?? 25)))
  const query = cleanText(filters.query)
  const status = filters.status && filters.status !== 'all' ? filters.status : undefined

  const where: Prisma.student_subscriptionsWhereInput = {
    ...(status ? { status } : {}),
    ...(filters.planId ? { plan_id: filters.planId } : {}),
    ...(query
      ? {
          OR: [
            { students: { name: { contains: query, mode: 'insensitive' } } },
            { students: { code: { contains: query, mode: 'insensitive' } } },
            { students: { phone: { contains: query, mode: 'insensitive' } } },
            { students: { email: { contains: query, mode: 'insensitive' } } },
            { plans: { title: { contains: query, mode: 'insensitive' } } },
          ],
        }
      : {}),
  }

  const [plans, subscriptions, total, groupedStatuses, distinctStudents, settings] = await prisma.$transaction([
    prisma.subscription_plans.findMany({ orderBy: [{ is_active: 'desc' }, { created_at: 'desc' }], select: planSelect }),
    prisma.student_subscriptions.findMany({
      where,
      orderBy: [{ end_date: 'desc' }, { created_at: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: subscriptionSelect,
    }),
    prisma.student_subscriptions.count({ where }),
    prisma.student_subscriptions.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.student_subscriptions.groupBy({ by: ['student_id'] }),
    prisma.platform_settings.findFirst({ select: { subscription_mode: true, grace_period_days: true } }),
  ])

  const statusCounts = Object.fromEntries(SUBSCRIPTION_STATUSES.map((key) => [key, 0])) as Record<SubscriptionStatus, number>
  for (const row of groupedStatuses) {
    if (row.status in statusCounts) statusCounts[row.status as SubscriptionStatus] = row._count._all
  }

  return {
    settings: {
      mode: settings?.subscription_mode ?? 'purchases_only',
      gracePeriodDays: settings?.grace_period_days ?? 0,
    },
    stats: {
      totalPlans: plans.length,
      activePlans: plans.filter((plan: any) => plan.is_active && !plan.archived_at).length,
      totalSubscriptions: total,
      uniqueStudents: distinctStudents.length,
      statusCounts,
    },
    plans: plans.map(serializePlan),
    subscriptions: subscriptions.map(serializeSubscription),
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  }
}

export async function createSubscriptionPlan(input: PlanInput, actorId: string) {
  assertPlanInput(input)
  const title = cleanText(input.title)
  const code = cleanText(input.code) || null
  const scopes = input.scopes ?? []

  const plan = await prisma.$transaction(async (tx) => {
    const created = await tx.subscription_plans.create({
      data: {
        code,
        title,
        description: cleanText(input.description),
        price: new Prisma.Decimal(finiteNumber(input.price)),
        duration_days: Math.floor(finiteNumber(input.durationDays)),
        billing_period: cleanText(input.billingPeriod, 'custom'),
        scope_mode: cleanText(input.scopeMode, 'all_released'),
        allow_manual_assignment: Boolean(input.allowManualAssignment),
        is_active: Boolean(input.isActive),
        stage_id: input.stageId || null,
        branch_id: input.branchId || null,
        created_by: actorId,
        updated_by: actorId,
      },
    })
    if (scopes.length > 0) {
      await tx.subscription_plan_scopes.createMany({
        data: scopes.map((scope) => ({
          plan_id: created.id,
          scope_type: cleanText(scope.scopeType),
          scope_id: scope.scopeId || null,
        })),
        skipDuplicates: true,
      })
    }
    return created
  })

  return plan.id
}

export async function updateSubscriptionPlan(planId: string, input: PlanInput, actorId: string) {
  if (!planId) throw new Error('معرّف الخطة مطلوب')
  assertPlanInput(input)
  const scopes = input.scopes ?? []

  await prisma.$transaction(async (tx) => {
    await tx.subscription_plans.update({
      where: { id: planId },
      data: {
        code: cleanText(input.code) || null,
        title: cleanText(input.title),
        description: cleanText(input.description),
        price: new Prisma.Decimal(finiteNumber(input.price)),
        duration_days: Math.floor(finiteNumber(input.durationDays)),
        billing_period: cleanText(input.billingPeriod, 'custom'),
        scope_mode: cleanText(input.scopeMode, 'all_released'),
        allow_manual_assignment: Boolean(input.allowManualAssignment),
        is_active: Boolean(input.isActive),
        stage_id: input.stageId || null,
        branch_id: input.branchId || null,
        updated_by: actorId,
        updated_at: new Date(),
        archived_at: input.isActive ? null : undefined,
      },
    })
    await tx.subscription_plan_scopes.deleteMany({ where: { plan_id: planId } })
    if (scopes.length > 0) {
      await tx.subscription_plan_scopes.createMany({
        data: scopes.map((scope) => ({ plan_id: planId, scope_type: cleanText(scope.scopeType), scope_id: scope.scopeId || null })),
        skipDuplicates: true,
      })
    }
  })
}

export async function setPlanActive(planId: string, isActive: boolean, actorId: string) {
  await prisma.subscription_plans.update({
    where: { id: planId },
    data: { is_active: isActive, archived_at: isActive ? null : new Date(), updated_by: actorId, updated_at: new Date() },
  })
}

export async function setSubscriptionMode(mode: string, gracePeriodDays: number, actorId: string) {
  const normalizedMode = ['purchases_only', 'subscriptions_only', 'hybrid'].includes(mode) ? mode : null
  if (!normalizedMode) throw new Error('وضع الاشتراكات غير صالح')
  const grace = Math.min(90, Math.max(0, Math.floor(finiteNumber(gracePeriodDays))))
  await prisma.platform_settings.upsert({
    where: { id: 1 },
    update: { subscription_mode: normalizedMode, grace_period_days: grace, updated_at: new Date() },
    create: { id: 1, subscription_mode: normalizedMode, grace_period_days: grace },
  })
  return { mode: normalizedMode, gracePeriodDays: grace, actorId }
}

export async function assignSubscription(params: {
  studentId: string
  planId: string
  actorId: string
  source?: string
  paymentStatus?: string
  paymentReference?: string | null
  startDate?: Date
  endDate?: Date
  graceUntil?: Date | null
}) {
  if (!params.studentId || !params.planId) throw new Error('الطالب والخطة مطلوبان')
  const now = params.startDate ?? new Date()

  return prisma.$transaction(async (tx) => {
    const [student, plan] = await Promise.all([
      tx.students.findUnique({ where: { id: params.studentId }, select: { id: true, name: true } }),
      tx.subscription_plans.findUnique({ where: { id: params.planId }, select: { id: true, title: true, duration_days: true, is_active: true, allow_manual_assignment: true } }),
    ])
    if (!student) throw new Error('الطالب غير موجود')
    if (!plan || !plan.is_active) throw new Error('الخطة غير موجودة أو غير مفعّلة')
    if (!plan.allow_manual_assignment) throw new Error('هذه الخطة لا تسمح بالإسناد اليدوي')

    const endDate = params.endDate ?? new Date(now.getTime() + plan.duration_days * 24 * 60 * 60 * 1000)
    if (endDate <= now) throw new Error('تاريخ انتهاء الاشتراك يجب أن يكون بعد البداية')

    const overlap = await tx.student_subscriptions.findFirst({
      where: {
        student_id: student.id,
        plan_id: plan.id,
        status: { in: ['active', 'grace'] },
        start_date: { lt: endDate },
        OR: [{ end_date: { gt: now } }, { grace_until: { gt: now } }],
      },
      select: { id: true },
    })
    if (overlap) throw new Error('يوجد اشتراك فعال أو داخل فترة السماح لنفس الطالب والخطة')

    const created = await tx.student_subscriptions.create({
      data: {
        student_id: student.id,
        plan_id: plan.id,
        start_date: now,
        end_date: endDate,
        status: 'active',
        source: cleanText(params.source, 'manual'),
        payment_status: cleanText(params.paymentStatus, 'waived'),
        payment_reference: params.paymentReference || null,
        grace_until: params.graceUntil || null,
        assigned_by: params.actorId,
        updated_by: params.actorId,
        last_payment_at: params.paymentStatus === 'paid' ? now : null,
        next_billing_at: endDate,
        plan_snapshot: { id: plan.id, title: plan.title, durationDays: plan.duration_days },
        events: { create: { event_type: 'created', actor_profile_id: params.actorId, to_status: 'active', reason: 'إسناد اشتراك' } },
      },
      select: { id: true },
    })
    return { id: created.id, studentName: student.name, planTitle: plan.title }
  })
}

export async function transitionSubscription(input: SubscriptionTransitionInput, actorId: string) {
  if (!SUBSCRIPTION_STATUSES.includes(input.toStatus)) throw new Error('حالة الاشتراك غير صالحة')
  const current = await prisma.student_subscriptions.findUnique({ where: { id: input.subscriptionId }, select: { id: true, status: true, student_id: true } })
  if (!current) throw new Error('الاشتراك غير موجود')
  if (current.status === input.toStatus) return
  if (current.status === 'cancelled') throw new Error('الاشتراك الملغى نهائي؛ أنشئ اشتراكًا جديدًا بدل إعادة فتحه')
  if (current.status === 'expired' && input.toStatus === 'active') throw new Error('الاشتراك المنتهي يحتاج إلى عملية تجديد صريحة')

  const now = new Date()
  const data: Prisma.student_subscriptionsUpdateInput = {
    status: input.toStatus,
    updated_by: actorId,
    updated_at: now,
    ...(input.paymentStatus ? { payment_status: input.paymentStatus } : {}),
    ...(input.paymentReference !== undefined ? { payment_reference: input.paymentReference } : {}),
    ...(input.graceUntil !== undefined ? { grace_until: input.graceUntil } : {}),
    ...(input.nextBillingAt !== undefined ? { next_billing_at: input.nextBillingAt } : {}),
    ...(input.toStatus === 'cancelled' ? { cancelled_at: now, cancel_reason: cleanText(input.reason, 'إلغاء إداري') } : {}),
    ...(input.toStatus === 'suspended' ? { suspended_at: now, suspend_reason: cleanText(input.reason, 'إيقاف إداري') } : {}),
    ...(input.toStatus === 'active' ? { cancelled_at: null, cancel_reason: null, suspended_at: null, suspend_reason: null } : {}),
  }

  await prisma.$transaction([
    prisma.student_subscriptions.update({ where: { id: input.subscriptionId }, data }),
    prisma.subscription_events.create({
      data: {
        subscription_id: input.subscriptionId,
        event_type: input.toStatus === 'cancelled' ? 'cancelled' : input.toStatus === 'suspended' ? 'suspended' : input.toStatus === 'expired' ? 'expired' : input.toStatus === 'grace' ? 'grace_started' : input.toStatus === 'active' ? 'resumed' : 'updated',
        actor_profile_id: actorId,
        from_status: current.status,
        to_status: input.toStatus,
        reason: cleanText(input.reason) || null,
        payment_reference: input.paymentReference || null,
      },
    }),
  ])
}

export async function getSubscriptionEvents(subscriptionId: string) {
  const events = await prisma.subscription_events.findMany({
    where: { subscription_id: subscriptionId },
    orderBy: { created_at: 'desc' },
    take: 100,
  })
  return events.map((event) => ({
    id: event.id,
    eventType: event.event_type,
    actorProfileId: event.actor_profile_id,
    fromStatus: event.from_status,
    toStatus: event.to_status,
    reason: event.reason,
    paymentReference: event.payment_reference,
    metadata: event.metadata,
    createdAt: event.created_at.toISOString(),
  }))
}


export async function renewSubscription(input: {
  subscriptionId: string
  actorId: string
  durationDays?: number
  paymentStatus?: string
  paymentReference?: string | null
  reason?: string
}) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.student_subscriptions.findUnique({
      where: { id: input.subscriptionId },
      include: { plans: { select: { id: true, title: true, duration_days: true } }, },
    })
    if (!current) throw new Error('الاشتراك غير موجود')
    if (current.status === 'cancelled') throw new Error('لا يمكن تجديد اشتراك ملغى؛ أنشئ اشتراكًا جديدًا')

    const durationDays = Math.floor(finiteNumber(input.durationDays, current.plans.duration_days))
    if (durationDays < 1 || durationDays > 3650) throw new Error('مدة التجديد يجب أن تكون بين يوم و3650 يومًا')

    const now = new Date()
    const baseDate = current.end_date > now ? current.end_date : now
    const endDate = new Date(baseDate.getTime() + durationDays * 24 * 60 * 60 * 1000)
    const paymentStatus = cleanText(input.paymentStatus, current.payment_status || 'waived')

    await tx.student_subscriptions.update({
      where: { id: current.id },
      data: {
        status: 'active',
        end_date: endDate,
        grace_until: null,
        next_billing_at: endDate,
        payment_status: paymentStatus,
        payment_reference: input.paymentReference === undefined ? current.payment_reference : input.paymentReference,
        last_payment_at: paymentStatus === 'paid' ? now : current.last_payment_at,
        cancelled_at: null,
        cancel_reason: null,
        suspended_at: null,
        suspend_reason: null,
        updated_by: input.actorId,
        updated_at: now,
      },
    })
    await tx.subscription_events.create({
      data: {
        subscription_id: current.id,
        event_type: 'renewed',
        actor_profile_id: input.actorId,
        from_status: current.status,
        to_status: 'active',
        reason: cleanText(input.reason, 'تجديد اشتراك إداري') || null,
        payment_reference: input.paymentReference || current.payment_reference || null,
        metadata: { durationDays, baseDate: baseDate.toISOString(), endDate: endDate.toISOString() },
      },
    })
    return { id: current.id, planTitle: current.plans.title, endDate: endDate.toISOString() }
  })
}

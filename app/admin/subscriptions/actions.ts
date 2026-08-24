'use server'

import { auth } from '@/auth'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { hasResourceAccess } from '@/lib/auth-guard'
import { logActivity } from '@/lib/audit-log'
import { computeSubscriptionStatus } from '@/lib/subscription-access'
import {
  assignSubscriptionInputSchema,
  managerFiltersSchema,
  planInputSchema,
  renewSubscriptionInputSchema,
  requestIdSchema,
  studentSearchQuerySchema,
  subscriptionModeInputSchema,
  transitionSubscriptionInputSchema,
  uuidId,
} from '@/lib/subscription-validation'
import {
  assignSubscriptionInTransaction,
  assignSubscription,
  createSubscriptionPlan,
  getSubscriptionManagerData,
  getSubscriptionPlanDetail,
  getSubscriptionScopeOptions,
  renewSubscription,
  renewSubscriptionInTransaction,
  setPlanActive,
  setSubscriptionMode,
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
    const safeFilters = managerFiltersSchema.parse(filters ?? {})
    const data = await getSubscriptionManagerData(safeFilters)
    // الحالة المحسوبة (بالتواريخ) تُشتق في المخدم من الدالة المرجعية الوحيدة —
    // العرض لا يثق بعمود status الخام أبدًا (خطة R4).
    const now = new Date()
    const subscriptions = data.subscriptions.map((sub: any) => {
      const computed = computeSubscriptionStatus(
        { end_date: new Date(sub.endDate), grace_until: sub.graceUntil ? new Date(sub.graceUntil) : null },
        data.settings.gracePeriodDays,
        now,
      )
      const endDate = sub.endDate ? new Date(sub.endDate).getTime() : null
      return {
        ...sub,
        computedStatus: computed,
        graceDaysLeft: computed === 'grace' && endDate !== null && sub.graceUntil
          ? Math.max(0, Math.ceil((new Date(sub.graceUntil).getTime() - now.getTime()) / (24 * 60 * 60 * 1000)))
          : null,
      }
    })
    return { ok: true as const, data: { ...data, subscriptions } }
  } catch (error) {
    return { ok: false as const, error: failMessage(error) }
  }
}

export async function createSubscriptionPlanAction(input: PlanInput) {
  try {
    const actorId = await requireSubscriptionManager()
    const parsed = planInputSchema.parse(input)
    const id = await createSubscriptionPlan(parsed, actorId)
    await logActivity({ action: 'create', resource: 'subscriptions', targetId: id, targetLabel: parsed.title, details: 'إنشاء خطة اشتراك' })
    revalidatePath('/admin/subscriptions')
    return { ok: true as const, id }
  } catch (error) {
    return { ok: false as const, error: failMessage(error) }
  }
}

export async function updateSubscriptionPlanAction(planId: string, input: PlanInput) {
  try {
    const actorId = await requireSubscriptionManager()
    const safePlanId = uuidId.parse(planId)
    const parsed = planInputSchema.parse(input)
    await updateSubscriptionPlan(safePlanId, parsed, actorId)
    await logActivity({ action: 'update', resource: 'subscriptions', targetId: safePlanId, targetLabel: parsed.title, details: 'تعديل خطة اشتراك ونطاقاتها' })
    revalidatePath('/admin/subscriptions')
    revalidatePath(`/admin/subscriptions/${safePlanId}`)
    return { ok: true as const }
  } catch (error) {
    return { ok: false as const, error: failMessage(error) }
  }
}

export async function setPlanActiveAction(planId: string, isActive: boolean) {
  try {
    const actorId = await requireSubscriptionManager()
    const safePlanId = uuidId.parse(planId)
    await setPlanActive(safePlanId, isActive === true, actorId)
    await logActivity({ action: 'update', resource: 'subscriptions', targetId: safePlanId, details: isActive ? 'تفعيل خطة اشتراك' : 'أرشفة خطة اشتراك' })
    revalidatePath('/admin/subscriptions')
    return { ok: true as const }
  } catch (error) {
    return { ok: false as const, error: failMessage(error) }
  }
}

export async function setSubscriptionModeAction(mode: string, gracePeriodDays: number) {
  try {
    const actorId = await requireSubscriptionManager()
    const parsed = subscriptionModeInputSchema.parse({ mode, gracePeriodDays })
    await setSubscriptionMode(parsed.mode, parsed.gracePeriodDays, actorId)
    await logActivity({ action: 'update', resource: 'subscriptions', targetLabel: 'إعدادات الاشتراكات', details: `تغيير وضع الاشتراكات إلى ${parsed.mode} وفترة السماح ${parsed.gracePeriodDays} يومًا` })
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
    const parsed = assignSubscriptionInputSchema.parse(input)
    const result = await assignSubscription({
      ...parsed,
      actorId,
      startDate: parsed.startDate ? new Date(parsed.startDate) : undefined,
      endDate: parsed.endDate ? new Date(parsed.endDate) : undefined,
      graceUntil: parsed.graceUntil ? new Date(parsed.graceUntil) : null,
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
    const parsed = renewSubscriptionInputSchema.parse(input)
    const result = await renewSubscription({ ...parsed, actorId })
    await logActivity({ action: 'update', resource: 'subscriptions', targetId: parsed.subscriptionId, targetLabel: result.planTitle, details: `تجديد الاشتراك حتى ${result.endDate}` })
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
    const parsed = transitionSubscriptionInputSchema.parse(input)
    await transitionSubscription({
      ...parsed,
      graceUntil: parsed.graceUntil === undefined ? undefined : parsed.graceUntil ? new Date(parsed.graceUntil) : null,
      nextBillingAt: parsed.nextBillingAt === undefined ? undefined : parsed.nextBillingAt ? new Date(parsed.nextBillingAt) : null,
    }, actorId)
    await logActivity({ action: 'update', resource: 'subscriptions', targetId: parsed.subscriptionId, details: `انتقال حالة الاشتراك إلى ${parsed.toStatus}` })
    revalidatePath('/admin/subscriptions')
    return { ok: true as const }
  } catch (error) {
    return { ok: false as const, error: failMessage(error) }
  }
}

export async function getSubscriptionPlanDetailAction(planId: string) {
  try {
    await requireSubscriptionManager()
    const safePlanId = uuidId.parse(planId)
    const plan = await getSubscriptionPlanDetail(safePlanId)
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

/** بحث سريع عن الطلاب لواجهة الإسناد اليدوي (محمية بنفس صلاحية المركز). */
export async function searchStudentsAction(query: string) {
  try {
    await requireSubscriptionManager()
    const term = studentSearchQuerySchema.parse(query ?? '')
    if (term.length < 1) return { ok: true as const, students: [] }
    const students = await prisma.students.findMany({
      where: {
        OR: [
          { name: { contains: term, mode: 'insensitive' } },
          { code: { contains: term, mode: 'insensitive' } },
          { phone: { contains: term } },
        ],
      },
      take: 10,
      orderBy: { name: 'asc' },
      select: { id: true, name: true, code: true, phone: true },
    })
    return { ok: true as const, students }
  } catch (error) {
    return { ok: false as const, error: failMessage(error), students: [] }
  }
}

/**
 * تفاصيل اشتراك واحد للعرض الإداري: لقطة الخطة وقت الشراء، الحالة المحسوبة،
 * بيانات فترة السماح، وسجل الأحداث الكامل بأسماء الفاعلين — دون لمس قاعدة البيانات يدويًا.
 */
export async function getSubscriptionDetailAction(subscriptionId: string) {
  try {
    await requireSubscriptionManager()
    const safeId = uuidId.parse(subscriptionId)

    const settings = await prisma.platform_settings.findFirst({ select: { grace_period_days: true } })
    const gracePeriodDays = settings?.grace_period_days ?? 3

    const subscription = await prisma.student_subscriptions.findUnique({
      where: { id: safeId },
      include: {
        students: { select: { id: true, name: true, code: true, email: true, phone: true } },
        plans: { include: { scopes: { orderBy: [{ scope_type: 'asc' }, { created_at: 'asc' }] } } },
      },
    })
    if (!subscription) return { ok: false as const, error: 'الاشتراك غير موجود' }

    const events = await prisma.subscription_events.findMany({
      where: { subscription_id: subscription.id },
      orderBy: { created_at: 'desc' },
      take: 100,
    })

    const actorIds = [...new Set(events.map((e) => e.actor_profile_id).filter((id): id is string => !!id))]
    const actors = actorIds.length
      ? await prisma.profiles.findMany({ where: { id: { in: actorIds } }, select: { id: true, full_name: true } })
      : []
    const actorNames = new Map(actors.map((a) => [a.id, a.full_name]))

    const now = new Date()
    const computedStatus = computeSubscriptionStatus(
      { end_date: subscription.end_date, grace_until: subscription.grace_until },
      gracePeriodDays,
      now,
    )

    const iso = (value: Date | null) => (value ? value.toISOString() : null)

    return {
      ok: true as const,
      detail: {
        id: subscription.id,
        rawStatus: subscription.status,
        computedStatus,
        source: subscription.source,
        paymentStatus: subscription.payment_status,
        paymentReference: subscription.payment_reference,
        startDate: iso(subscription.start_date),
        endDate: iso(subscription.end_date),
        graceUntil: iso(subscription.grace_until),
        graceDaysLeft:
          computedStatus === 'grace'
            ? Math.max(0, Math.ceil(((subscription.grace_until ?? subscription.end_date).getTime() - now.getTime()) / (24 * 60 * 60 * 1000)))
            : null,
        cancelledAt: iso(subscription.cancelled_at),
        cancelReason: subscription.cancel_reason,
        suspendedAt: iso(subscription.suspended_at),
        suspendReason: subscription.suspend_reason,
        lastPaymentAt: iso(subscription.last_payment_at),
        nextBillingAt: iso(subscription.next_billing_at),
        planSnapshot: subscription.plan_snapshot ?? null,
        student: subscription.students,
        plan: subscription.plans
          ? {
              id: subscription.plans.id,
              title: subscription.plans.title,
              price: Number(subscription.plans.price),
              durationDays: subscription.plans.duration_days,
              scopeMode: subscription.plans.scope_mode,
              isActive: subscription.plans.is_active,
              scopes: subscription.plans.scopes.map((scope) => ({ scopeType: scope.scope_type, scopeId: scope.scope_id })),
            }
          : null,
        events: events.map((event) => ({
          id: event.id,
          eventType: event.event_type,
          actorName: event.actor_profile_id ? actorNames.get(event.actor_profile_id) ?? event.actor_profile_id : 'النظام',
          fromStatus: event.from_status,
          toStatus: event.to_status,
          reason: event.reason,
          paymentReference: event.payment_reference,
          metadata: event.metadata ?? null,
          createdAt: event.created_at.toISOString(),
        })),
      },
    }
  } catch (error) {
    return { ok: false as const, error: failMessage(error) }
  }
}

/** قائمة طلبات الاشتراك لطابور الاعتماد الإداري. */
export async function listSubscriptionRequestsAction(status?: 'pending' | 'approved' | 'rejected' | 'cancelled') {
  try {
    await requireSubscriptionManager()
    const safeStatus = status === undefined
      ? undefined
      : z.enum(['pending', 'approved', 'rejected', 'cancelled']).parse(status)
    const requests = await prisma.subscription_requests.findMany({
      where: safeStatus ? { status: safeStatus } : undefined,
      orderBy: { created_at: 'desc' },
      take: 50,
      select: {
        id: true, code: true, status: true,
        student_name: true, student_email: true, student_phone: true,
        plan_id: true, plan_title: true, plan_snapshot: true,
        receipt_url: true, payment_method: true, reference: true,
        student_note: true, admin_note: true,
        reviewed_at: true, created_at: true,
      },
    })
    return {
      ok: true as const,
      requests: requests.map((req) => ({
        id: req.id,
        code: req.code,
        status: req.status as 'pending' | 'approved' | 'rejected' | 'cancelled',
        studentName: req.student_name,
        studentContact: req.student_phone || req.student_email || '',
        planId: req.plan_id,
        planTitle: req.plan_title,
        snapshotPrice: (req.plan_snapshot as any)?.price ?? null,
        receiptUrl: req.receipt_url,
        paymentMethod: req.payment_method,
        reference: req.reference,
        studentNote: req.student_note,
        adminNote: req.admin_note,
        createdAt: req.created_at.toISOString(),
        reviewedAt: req.reviewed_at ? req.reviewed_at.toISOString() : null,
      })),
    }
  } catch (error) {
    return { ok: false as const, error: failMessage(error), requests: [] }
  }
}

/**
 * اعتماد طلب اشتراك — ذرّي بالكامل داخل معاملة واحدة:
 * حجز الطلب (pending -> processing) ثم إنشاء/تجديد الاشتراك عبر الأنوية المرجعية
 * في subscription-manager، ثم حدث payment_recorded، ثم إقرار الطلب approved.
 * أي فشل (مثل تداخل اشتراك) يرجع المعاملة كاملة ويبقى الطلب pending للمراجعة.
 * مزدوج-النقر آمن: المحاولة الثانية تجد الطلب لم يعد pending فتُعاد نجاح بلا عمل.
 */
export async function approveSubscriptionRequestAction(requestId: string) {
  try {
    const actorId = await requireSubscriptionManager()
    const safeRequestId = requestIdSchema.parse(requestId)

    const result = await prisma.$transaction(async (tx) => {
      const claim = await tx.subscription_requests.updateMany({
        where: { id: safeRequestId, status: 'pending' },
        data: { status: 'processing', updated_at: new Date() },
      })
      if (claim.count === 0) return { noop: true as const }

      const request = await tx.subscription_requests.findUnique({ where: { id: safeRequestId } })
      if (!request) throw new Error('الطلب غير موجود')

      const student = await tx.students.findFirst({
        where: { user_id: request.student_id },
        select: { id: true, name: true },
      })
      if (!student) throw new Error('لم يتم العثور على حساب الطالب المرتبط بالطلب')

      const plan = await tx.subscription_plans.findUnique({
        where: { id: request.plan_id },
        select: { id: true, title: true, duration_days: true, is_active: true },
      })
      if (!plan || !plan.is_active) throw new Error('خطة هذا الطلب لم تعد مفعّلة — ارفض الطلب أو فعّل الخطة')

      const now = new Date()
      const currentSub = await tx.student_subscriptions.findFirst({
        where: {
          student_id: student.id,
          plan_id: plan.id,
          status: { in: ['active', 'grace'] },
          OR: [{ end_date: { gt: now } }, { grace_until: { gt: now } }],
        },
        select: { id: true },
      })

      let subscriptionId: string
      let outcome: string
      if (currentSub) {
        // تجديد: يمدد من نهاية الفترة الحالية ولا يقصرها أبدًا.
        const renewed = await renewSubscriptionInTransaction(tx, {
          subscriptionId: currentSub.id,
          actorId,
          durationDays: plan.duration_days,
          paymentStatus: 'paid',
          paymentReference: request.reference || request.receipt_url || null,
          reason: `تجديد عبر اعتماد الطلب ${request.code}`,
        })
        subscriptionId = renewed.id
        outcome = renewed.endDate
      } else {
        const assigned = await assignSubscriptionInTransaction(tx, {
          studentId: student.id,
          planId: plan.id,
          actorId,
          source: 'request',
          paymentStatus: 'paid',
          paymentReference: request.reference || request.receipt_url || null,
          allowManualAssignmentBypass: true,
        })
        subscriptionId = assigned.id
        outcome = 'created'
      }

      await tx.subscription_events.create({
        data: {
          subscription_id: subscriptionId,
          event_type: 'payment_recorded',
          actor_profile_id: actorId,
          to_status: currentSub ? 'active' : null,
          reason: `اعتماد طلب اشتراك ${request.code}`,
          payment_reference: request.receipt_url || request.reference || null,
          metadata: {
            requestId: request.id,
            requestCode: request.code,
            receiptUrl: request.receipt_url,
            method: request.payment_method,
            reference: request.reference,
            renewed: !!currentSub,
          },
        },
      })

      const confirm = await tx.subscription_requests.updateMany({
        where: { id: request.id, status: 'processing' },
        data: { status: 'approved', reviewed_by: actorId, reviewed_at: now, updated_at: now },
      })
      if (confirm.count === 0) throw new Error('تغيّرت حالة الطلب أثناء الاعتماد — أعد المحاولة')

      return { noop: false as const, subscriptionId, outcome, planTitle: plan.title, studentName: student.name }
    })

    revalidatePath('/admin/subscriptions')
    revalidatePath('/student/subscriptions')
    return result.noop
      ? { ok: true as const, noop: true as const }
      : { ok: true as const, noop: false as const, ...result }
  } catch (error) {
    // أي خطأ يعيد المعاملة كاملة: الطلب يظل pending ويمكن إعادة المحاولة.
    return { ok: false as const, error: failMessage(error) }
  }
}

/** رفض طلب اشتراك — يتطلب سببًا يظهر للطالب. */
export async function rejectSubscriptionRequestAction(requestId: string, adminNote: string) {
  try {
    const actorId = await requireSubscriptionManager()
    const safeRequestId = requestIdSchema.parse(requestId)
    const note = z.string().trim().min(1, 'سبب الرفض مطلوب وسيظهر للطالب').max(500).parse(adminNote ?? '')

    const result = await prisma.subscription_requests.updateMany({
      where: { id: safeRequestId, status: 'pending' },
      data: { status: 'rejected', admin_note: note, reviewed_by: actorId, reviewed_at: new Date(), updated_at: new Date() },
    })
    if (result.count === 0) throw new Error('لا يمكن رفض هذا الطلب (قد يكون معتمدًا أو ملغى بالفعل)')

    revalidatePath('/admin/subscriptions')
    revalidatePath('/student/subscriptions')
    return { ok: true as const }
  } catch (error) {
    return { ok: false as const, error: failMessage(error) }
  }
}

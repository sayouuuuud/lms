'use server'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getSubscriptionMode } from '@/lib/subscription-access'
import { subscriptionIsCurrentlyUsable } from '@/lib/subscription-rules'
import { createSubscriptionRequestInputSchema, requestIdSchema, firstIssueMessage } from '@/lib/subscription-validation'

async function requireStudent() {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) throw new Error('يجب تسجيل الدخول أولاً')
  const student = await prisma.students.findFirst({
    where: { user_id: userId },
    select: { id: true, user_id: true, name: true, email: true, phone: true },
  })
  if (!student || !student.user_id) throw new Error('حساب الطالب غير موجود')
  return { ...student, user_id: student.user_id }
}

function fail(error: unknown): never {
  throw error instanceof Error ? error : new Error('تعذر تنفيذ العملية')
}

function generateRequestCode(): string {
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `REQ-${Date.now().toString(36).toUpperCase()}-${rand}`
}

export async function createSubscriptionRequest(rawInput: unknown) {
  try {
    const student = await requireStudent()
    const parsed = createSubscriptionRequestInputSchema.safeParse(rawInput)
    if (!parsed.success) return { ok: false as const, error: firstIssueMessage(parsed.error) }
    const input = parsed.data

    const mode = await getSubscriptionMode()
    if (mode === 'purchases_only') fail(new Error('الاشتراكات غير متاحة حالياً على المنصة.'))

    const planId = input.planId
    const method = input.method
    const receiptUrl = input.receiptUrl

    const plan = await prisma.subscription_plans.findUnique({ where: { id: planId } })
    if (!plan || !plan.is_active || !plan.public_visible) {
      fail(new Error('هذه الخطة غير متاحة للاشتراك حالياً'))
    }

    // طلب معلّق آخر لنفس الخطة؟
    const duplicatePending = await prisma.subscription_requests.findFirst({
      where: { student_id: student.user_id, plan_id: plan.id, status: 'pending' },
      select: { id: true },
    })
    if (duplicatePending) {
      fail(new Error('لديك طلب اشتراك معلّق لنفس الخطة بالفعل، بانتظار مراجعة الإدارة.'))
    }

    // هل لديه اشتراك ساري لهذه الخطة؟ مسموح فقط داخل نافذة التجديد (فترة سماح أو ≤7 أيام من الانتهاء).
    const now = new Date()
    const currentSubs = await prisma.student_subscriptions.findMany({
      where: { student_id: student.id, plan_id: plan.id, status: { in: ['active', 'grace'] } },
    })
    const usableNow = currentSubs.find((sub) => subscriptionIsCurrentlyUsable(sub, now))
    if (usableNow) {
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
      const graceActive = !!usableNow.grace_until && usableNow.grace_until.getTime() >= now.getTime()
      const nearExpiry = usableNow.end_date.getTime() - now.getTime() <= sevenDaysMs
      if (!graceActive && !nearExpiry) {
        fail(new Error('لديك اشتراك ساري لنفس الخطة بالفعل. يمكنك التجديد قبل الانتهاء بأسبوع.'))
      }
    }

    const snapshot = {
      id: plan.id,
      title: plan.title,
      price: Number(plan.price),
      durationDays: plan.duration_days,
      billingPeriod: plan.billing_period,
      scopeMode: plan.scope_mode,
      scopes: [],
    }

    const created = await prisma.subscription_requests.create({
      data: {
        code: generateRequestCode(),
        student_id: student.user_id,
        student_name: student.name ?? '',
        student_email: student.email ?? '',
        student_phone: student.phone ?? '',
        plan_id: plan.id,
        plan_title: plan.title,
        plan_snapshot: snapshot,
        status: 'pending',
        receipt_url: receiptUrl,
        payment_method: method,
        reference: input.reference?.trim() ?? null,
        student_note: input.note?.trim() ?? null,
      },
      select: { id: true, code: true },
    })

    revalidatePath('/student/subscriptions')
    return { ok: true as const, id: created.id, code: created.code }
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : 'تعذر إنشاء الطلب' }
  }
}

export async function cancelSubscriptionRequest(rawRequestId: unknown) {
  try {
    const student = await requireStudent()
    const parsedId = requestIdSchema.safeParse(rawRequestId)
    if (!parsedId.success) return { ok: false as const, error: firstIssueMessage(parsedId.error) }
    const id = parsedId.data

    // تحديث مشروط يضمن الملكية وحالة pending في خطوة واحدة ذرية.
    const result = await prisma.subscription_requests.updateMany({
      where: { id, student_id: student.user_id, status: 'pending' },
      data: { status: 'cancelled' },
    })
    if (result.count === 0) fail(new Error('لا يمكن إلغاء هذا الطلب (قد يكون قد رُوجع بالفعل)'))

    revalidatePath('/student/subscriptions')
    return { ok: true as const }
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : 'تعذر إلغاء الطلب' }
  }
}

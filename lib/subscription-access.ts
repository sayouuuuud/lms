import 'server-only'

import { prisma } from '@/lib/prisma'
import {
  normalizeSubscriptionMode,
  subscriptionIsCurrentlyUsable,
} from '@/lib/subscription-rules'
export { normalizeSubscriptionMode, subscriptionIsCurrentlyUsable } from '@/lib/subscription-rules'

const isReleasedFilter = {
  is_published: true,
  OR: [{ release_date: null }, { release_date: { lte: new Date() } }],
}

export type SubscriptionMode = 'purchases_only' | 'subscriptions_only' | 'hybrid'
export type SubscriptionAccessReason = 'subscription' | 'purchase' | 'none' | 'mode_disabled'

export type SubscriptionAccessState = {
  allowed: boolean
  reason: SubscriptionAccessReason
  subscriptionIds: string[]
  planTitles: string[]
  graceActive: boolean
}

/**
 * النطاقات الفعّالة للخطة: نطاقات الخطة المُسجّلة + فرعها ومرحلتها العلويين.
 * تُبنى في نقطة واحدة (foldPlanScopes) حتى لا يتكرر منطق الدمج في أي مكان آخر.
 */
export type EffectivePlanScope = { scope_type: string; scope_id: string | null }

/**
 * إحداثيات المحتوى التي يُفحص تغطيتها من نطاق الخطة.
 * الحقول الإضافية (monthlyCourseId/courseBranchId/courseStageId) تحافظ على دلالات
 * المطابقة القديمة حرفيًا: كورس/فرع/مرحلة عبر سلسلة الكورس الشهري أو الكورس القديم.
 */
export type SubscriptionCoverageTarget = {
  stageId?: string | null
  branchId?: string | null
  termId?: string | null
  courseId?: string | null
  monthlyCourseId?: string | null
  courseBranchId?: string | null
  courseStageId?: string | null
  lectureId?: string | null
}

/**
 * الدالّة المرجعية الوحيدة لمطابقة النطاقات (نقية: بلا استعلامات ولا آثار جانبية).
 * كل بوابات المحتوى (محاضرات، امتحانات) يجب أن تمر عبرها — يمنع انقسام المنطق مجددًا.
 */
export function subscriptionCoversTarget(
  scopes: EffectivePlanScope[],
  target: SubscriptionCoverageTarget,
): boolean {
  if (!scopes || scopes.length === 0) return false

  return scopes.some((scope) => {
    if (scope.scope_type === 'all_released') return true
    if (!scope.scope_id) return false
    if (scope.scope_type === 'lecture') return !!target.lectureId && scope.scope_id === target.lectureId
    if (scope.scope_type === 'course') {
      return (!!target.courseId && scope.scope_id === target.courseId)
        || (!!target.monthlyCourseId && scope.scope_id === target.monthlyCourseId)
    }
    if (scope.scope_type === 'branch') {
      return (!!target.branchId && scope.scope_id === target.branchId)
        || (!!target.courseBranchId && scope.scope_id === target.courseBranchId)
    }
    if (scope.scope_type === 'term') return !!target.termId && scope.scope_id === target.termId
    if (scope.scope_type === 'stage') {
      return (!!target.stageId && scope.scope_id === target.stageId)
        || (!!target.courseStageId && scope.scope_id === target.courseStageId)
    }
    return false
  })
}

/** تُنتج النطاقات الفعّالة: صفوف النطاقات + فرع/مرحلة الخطة + وضع all_released الفارغ. */
function foldPlanScopes(plan: {
  scope_mode: string
  branch_id: string | null
  stage_id: string | null
  scopes: Array<{ scope_type: string; scope_id: string | null }>
}): EffectivePlanScope[] {
  const scopes: EffectivePlanScope[] = [...plan.scopes]
  if (
    plan.scope_mode === 'all_released' &&
    scopes.length === 0 &&
    !plan.branch_id &&
    !plan.stage_id
  ) {
    return [{ scope_type: 'all_released', scope_id: null }]
  }
  if (plan.branch_id) scopes.push({ scope_type: 'branch', scope_id: plan.branch_id })
  if (plan.stage_id) scopes.push({ scope_type: 'stage', scope_id: plan.stage_id })
  return scopes
}

/**
 * الحالة المحسوبة للاشتراك لأغراض العرض فقط — لا تُستخدم أبدًا لقرارات الوصول
 * (قرار الوصول يعتمد على التواريخ عبر subscriptionIsCurrentlyUsable).
 */
export function computeSubscriptionStatus(
  sub: { end_date: Date; grace_until: Date | null },
  gracePeriodDays: number,
  now = new Date(),
): 'active' | 'grace' | 'expired' {
  if (now.getTime() <= sub.end_date.getTime()) return 'active'
  const graceEnd = sub.grace_until ?? new Date(sub.end_date.getTime() + Math.max(0, Math.floor(gracePeriodDays)) * 24 * 60 * 60 * 1000)
  return now.getTime() <= graceEnd.getTime() ? 'grace' : 'expired'
}

type ActivePlan = {
  subscription_id: string
  id: string
  title: string
  branch_id: string | null
  stage_id: string | null
  scope_mode: string
  scopes: Array<{ scope_type: string; scope_id: string | null }>
  /** النطاقات بعد دمج فرع/مرحلة الخطة — هي ما يُمرَّر إلى subscriptionCoversTarget. */
  effectiveScopes: EffectivePlanScope[]
  end_date: Date
  grace_until: Date | null
}

async function getStudentIdForUser(userId: string): Promise<string | null> {
  const student = await prisma.students.findFirst({ where: { user_id: userId }, select: { id: true } })
  return student?.id ?? null
}

async function getUsablePlansForUser(userId: string, now = new Date()): Promise<ActivePlan[]> {
  const studentId = await getStudentIdForUser(userId)
  if (!studentId) return []

  const rows = await prisma.student_subscriptions.findMany({
    where: { student_id: studentId },
    select: {
      id: true,
      status: true,
      payment_status: true,
      start_date: true,
      end_date: true,
      grace_until: true,
      plans: {
        select: {
          id: true,
          title: true,
          branch_id: true,
          stage_id: true,
          scope_mode: true,
          scopes: { select: { scope_type: true, scope_id: true } },
        },
      },
    },
  })

  return rows
    .filter((row) => subscriptionIsCurrentlyUsable(row, now))
    .map((row) => ({
      ...row.plans,
      subscription_id: row.id,
      effectiveScopes: foldPlanScopes(row.plans),
      end_date: row.end_date,
      grace_until: row.grace_until,
    }))
}

export async function getSubscriptionMode(): Promise<SubscriptionMode> {
  const settings = await prisma.platform_settings.findFirst({ select: { subscription_mode: true } })
  return normalizeSubscriptionMode(settings?.subscription_mode)
}

export async function getSubscriptionAccessState(
  userId: string,
  lectureId: string,
  now = new Date(),
): Promise<SubscriptionAccessState> {
  const mode = await getSubscriptionMode()
  if (mode === 'purchases_only') {
    return { allowed: false, reason: 'mode_disabled', subscriptionIds: [], planTitles: [], graceActive: false }
  }

  const lecture = await prisma.lectures.findUnique({
    where: { id: lectureId },
    select: {
      id: true,
      branch_id: true,
      monthly_course_id: true,
      monthly_courses: {
        select: {
          id: true,
          branch_id: true,
          term_id: true,
          branches: { select: { stage_id: true } },
        },
      },
    },
  })
  if (!lecture) return { allowed: false, reason: 'none', subscriptionIds: [], planTitles: [], graceActive: false }

  const plans = await getUsablePlansForUser(userId, now)
  const target: SubscriptionCoverageTarget = {
    lectureId: lecture.id,
    branchId: lecture.branch_id,
    monthlyCourseId: lecture.monthly_course_id,
    courseId: lecture.monthly_courses?.id ?? null,
    courseBranchId: lecture.monthly_courses?.branch_id ?? null,
    termId: lecture.monthly_courses?.term_id ?? null,
    stageId: lecture.monthly_courses?.branches?.stage_id ?? null,
    courseStageId: lecture.monthly_courses?.branches?.stage_id ?? null,
  }
  const matched = plans.filter((plan) => subscriptionCoversTarget(plan.effectiveScopes, target))
  const nowMs = Date.now()
  const graceActive = matched.some(
    (plan) => plan.end_date.getTime() < nowMs && plan.grace_until != null && plan.grace_until.getTime() >= nowMs,
  )

  return {
    allowed: matched.length > 0,
    reason: matched.length > 0 ? 'subscription' : 'none',
    subscriptionIds: matched.map((plan) => plan.subscription_id),
    planTitles: matched.map((plan) => plan.title),
    graceActive,
  }
}

export async function getSubscriptionAccessibleContent(userId: string, now = new Date()): Promise<{
  lectureIds: string[]
  courseIds: string[]
}> {
  const mode = await getSubscriptionMode()
  if (mode === 'purchases_only') return { lectureIds: [], courseIds: [] }

  const plans = await getUsablePlansForUser(userId, now)
  if (plans.length === 0) return { lectureIds: [], courseIds: [] }

  const lectures = await prisma.lectures.findMany({
    where: isReleasedFilter,
    select: {
      id: true,
      branch_id: true,
      monthly_course_id: true,
      monthly_courses: {
        select: {
          id: true,
          branch_id: true,
          term_id: true,
          branches: { select: { stage_id: true } },
        },
      },
    },
  })

  const lectureIds: string[] = []
  const courseIds = new Set<string>()
  for (const lecture of lectures) {
    if (!plans.some((plan) => subscriptionCoversTarget(plan.effectiveScopes, {
      lectureId: lecture.id,
      branchId: lecture.branch_id,
      monthlyCourseId: lecture.monthly_course_id,
      courseId: lecture.monthly_courses?.id ?? null,
      courseBranchId: lecture.monthly_courses?.branch_id ?? null,
      termId: lecture.monthly_courses?.term_id ?? null,
      stageId: lecture.monthly_courses?.branches?.stage_id ?? null,
      courseStageId: lecture.monthly_courses?.branches?.stage_id ?? null,
    }))) continue
    lectureIds.push(lecture.id)
    if (lecture.monthly_course_id) courseIds.add(lecture.monthly_course_id)
  }

  return { lectureIds, courseIds: [...courseIds] }
}

/**
 * فحص اشتراكات الطالب مقابل امتحان (الامتحانات ترتبط بفرع/مرحلة فقط — راجع model exams).
 * يُستخدم عبر واجهة checkContentAccess في lib/lecture-access.ts؛ لا تستدعيها مباشرة.
 */
export async function getExamSubscriptionAccessState(
  userId: string,
  exam: { stage_id?: string | null; branch_id?: string | null },
  now = new Date(),
): Promise<SubscriptionAccessState> {
  const mode = await getSubscriptionMode()
  if (mode === 'purchases_only') {
    return { allowed: false, reason: 'mode_disabled', subscriptionIds: [], planTitles: [], graceActive: false }
  }

  const plans = await getUsablePlansForUser(userId, now)
  const matched = plans.filter((plan) => subscriptionCoversTarget(plan.effectiveScopes, {
    stageId: exam.stage_id ?? null,
    branchId: exam.branch_id ?? null,
  }))
  const graceActive = matched.some(
    (plan) => plan.end_date.getTime() < now.getTime() && plan.grace_until != null && plan.grace_until.getTime() >= now.getTime(),
  )

  return {
    allowed: matched.length > 0,
    reason: matched.length > 0 ? 'subscription' : 'none',
    subscriptionIds: matched.map((plan) => plan.subscription_id),
    planTitles: matched.map((plan) => plan.title),
    graceActive,
  }
}

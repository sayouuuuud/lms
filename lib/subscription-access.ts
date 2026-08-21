import 'server-only'

import { prisma } from '@/lib/prisma'
import {
  normalizeSubscriptionMode,
  subscriptionIsCurrentlyUsable,
  subscriptionScopeMatchesLecture,
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
}

type ActivePlan = {
  subscription_id: string
  id: string
  title: string
  branch_id: string | null
  stage_id: string | null
  scope_mode: string
  scopes: Array<{ scope_type: string; scope_id: string | null }>
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
    .map((row) => ({ ...row.plans, subscription_id: row.id, }))
}

export async function getSubscriptionMode(): Promise<SubscriptionMode> {
  const settings = await prisma.platform_settings.findFirst({ select: { subscription_mode: true } })
  return normalizeSubscriptionMode(settings?.subscription_mode)
}

export async function hasUsableSubscription(userId: string, now = new Date()): Promise<boolean> {
  const mode = await getSubscriptionMode()
  if (mode === 'purchases_only') return false
  return (await getUsablePlansForUser(userId, now)).length > 0
}

export async function getSubscriptionAccessState(
  userId: string,
  lectureId: string,
  now = new Date(),
): Promise<SubscriptionAccessState> {
  const mode = await getSubscriptionMode()
  if (mode === 'purchases_only') {
    return { allowed: false, reason: 'mode_disabled', subscriptionIds: [], planTitles: [] }
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
  if (!lecture) return { allowed: false, reason: 'none', subscriptionIds: [], planTitles: [] }

  const plans = await getUsablePlansForUser(userId, now)
  const matched = plans.filter((plan) => subscriptionScopeMatchesLecture(plan, {
    id: lecture.id,
    branch_id: lecture.branch_id,
    monthly_course_id: lecture.monthly_course_id,
    course: lecture.monthly_courses
      ? {
          id: lecture.monthly_courses.id,
          branch_id: lecture.monthly_courses.branch_id,
          term_id: lecture.monthly_courses.term_id,
          stage_id: lecture.monthly_courses.branches?.stage_id ?? null,
        }
      : null,
  }))

  return {
    allowed: matched.length > 0,
    reason: matched.length > 0 ? 'subscription' : 'none',
    subscriptionIds: matched.map((plan) => plan.subscription_id),
    planTitles: matched.map((plan) => plan.title),
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
    const course = lecture.monthly_courses
      ? {
          id: lecture.monthly_courses.id,
          branch_id: lecture.monthly_courses.branch_id,
          term_id: lecture.monthly_courses.term_id,
          stage_id: lecture.monthly_courses.branches?.stage_id ?? null,
        }
      : null
    if (!plans.some((plan) => subscriptionScopeMatchesLecture(plan, { ...lecture, course }))) continue
    lectureIds.push(lecture.id)
    if (lecture.monthly_course_id) courseIds.add(lecture.monthly_course_id)
  }

  return { lectureIds, courseIds: [...courseIds] }
}

export async function getSubscriptionSummaryForStudent(userId: string, now = new Date()) {
  const studentId = await getStudentIdForUser(userId)
  if (!studentId) return { studentId: null, active: [], expiringSoon: [], history: [] }

  const rows = await prisma.student_subscriptions.findMany({
    where: { student_id: studentId },
    orderBy: { end_date: 'desc' },
    select: {
      id: true,
      status: true,
      source: true,
      payment_status: true,
      start_date: true,
      end_date: true,
      grace_until: true,
      cancelled_at: true,
      plans: { select: { id: true, title: true, billing_period: true, scope_mode: true } },
    },
  })

  const active = rows.filter((row) => subscriptionIsCurrentlyUsable(row, now))
  const expiringSoon = active.filter((row) => row.end_date.getTime() - now.getTime() <= 7 * 24 * 60 * 60 * 1000)
  return { studentId, active, expiringSoon, history: rows }
}

export type SubscriptionMode = 'purchases_only' | 'subscriptions_only' | 'hybrid'

export type SubscriptionScope = {
  scope_type: string
  scope_id: string | null
}

export type SubscriptionPlanForAccess = {
  branch_id: string | null
  stage_id: string | null
  scope_mode: string
  scopes: SubscriptionScope[]
}

export type LectureForSubscriptionAccess = {
  id: string
  branch_id: string
  monthly_course_id: string | null
  course: {
    id: string
    branch_id: string
    term_id: string | null
    stage_id: string | null
  } | null
}

export function normalizeSubscriptionMode(value: string | null | undefined): SubscriptionMode {
  if (value === 'subscriptions_only' || value === 'subscription_only') return 'subscriptions_only'
  if (value === 'hybrid' || value === 'both' || value === 'purchases_and_subscriptions') return 'hybrid'
  return 'purchases_only'
}

export function subscriptionIsCurrentlyUsable(
  subscription: {
    status: string
    payment_status?: string | null
    start_date: Date
    end_date: Date
    grace_until: Date | null
  },
  now = new Date(),
): boolean {
  if (subscription.status === 'cancelled' || subscription.status === 'suspended' || subscription.status === 'expired') return false
  if (subscription.payment_status && ['unpaid', 'pending', 'refunded'].includes(subscription.payment_status)) return false
  if (subscription.start_date > now) return false
  if (subscription.end_date >= now) return subscription.status === 'active' || subscription.status === 'grace'
  return subscription.grace_until != null && subscription.grace_until >= now && (subscription.status === 'active' || subscription.status === 'grace')
}

export function subscriptionScopeMatchesLecture(
  plan: SubscriptionPlanForAccess,
  lecture: LectureForSubscriptionAccess,
): boolean {
  if (plan.scope_mode === 'all_released' && plan.scopes.length === 0 && !plan.branch_id && !plan.stage_id) return true

  const targets: SubscriptionScope[] = [...plan.scopes]
  if (plan.branch_id) targets.push({ scope_type: 'branch', scope_id: plan.branch_id })
  if (plan.stage_id) targets.push({ scope_type: 'stage', scope_id: plan.stage_id })
  if (targets.length === 0) return plan.scope_mode === 'all_released'

  return targets.some((scope) => {
    if (scope.scope_type === 'all_released') return true
    if (!scope.scope_id) return false
    if (scope.scope_type === 'lecture') return scope.scope_id === lecture.id
    if (scope.scope_type === 'course') return scope.scope_id === lecture.monthly_course_id || scope.scope_id === lecture.course?.id
    if (scope.scope_type === 'branch') return scope.scope_id === lecture.branch_id || scope.scope_id === lecture.course?.branch_id
    if (scope.scope_type === 'term') return scope.scope_id === lecture.course?.term_id
    if (scope.scope_type === 'stage') return scope.scope_id === lecture.course?.stage_id
    return false
  })
}

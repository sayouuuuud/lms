import { z } from 'zod'
import type { SubscriptionStatus } from '@/lib/subscription-manager'

/** طبقة التحقق المرجعية لكل إجراءات الاشتراك — تُستدعى بعد حارس الصلاحية مباشرة. */

export const uuidId = z.string().uuid('معرّف غير صالح')

export const SUBSCRIPTION_PAYMENT_STATUSES = ['paid', 'unpaid', 'pending', 'refunded', 'waived'] as const
const paymentStatus = z.enum(SUBSCRIPTION_PAYMENT_STATUSES)

const isoDate = z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'تاريخ غير صالح'))

const scopeSchema = z.object({
  scopeType: z.enum(['all_released', 'branch', 'stage', 'term', 'course', 'lecture']),
  scopeId: z.string().uuid().nullable().optional(),
})

export const planInputSchema = z.object({
  title: z.string().trim().min(2, 'اسم الخطة قصير جدًا').max(120),
  description: z.string().max(2000).optional(),
  marketingLabel: z.string().trim().max(120).nullable().optional(),
  shortDescription: z.string().max(300).nullable().optional(),
  imageUrl: z.string().trim().max(600).nullable().optional(),
  publicVisible: z.boolean().optional(),
  featured: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(10000).optional(),
  price: z.number().min(0, 'السعر غير صالح'),
  durationDays: z.number().int().min(1).max(3650),
  billingPeriod: z.enum(['month', 'term', 'year', 'custom']),
  scopeMode: z.enum(['all_released', 'selected']),
  allowManualAssignment: z.boolean(),
  isActive: z.boolean(),
  code: z.string().trim().max(80).optional(),
  stageId: uuidId.nullable().optional(),
  branchId: uuidId.nullable().optional(),
  scopes: z.array(scopeSchema).max(500).optional(),
})

export const managerFiltersSchema = z.object({
  query: z.string().trim().max(120).optional(),
  status: z.enum(['active', 'grace', 'expired', 'cancelled', 'suspended', 'all']).optional(),
  planId: uuidId.optional(),
  page: z.number().int().min(1).max(10000).optional(),
  pageSize: z.number().int().min(10).max(100).optional(),
})

export const assignSubscriptionInputSchema = z.object({
  studentId: uuidId,
  planId: uuidId,
  source: z.string().trim().max(40).optional(),
  paymentStatus: paymentStatus.optional(),
  paymentReference: z.string().trim().max(200).nullable().optional(),
  startDate: isoDate.optional(),
  endDate: isoDate.optional(),
  graceUntil: isoDate.nullable().optional(),
})

export const renewSubscriptionInputSchema = z.object({
  subscriptionId: uuidId,
  durationDays: z.number().int().min(1).max(3650).optional(),
  paymentStatus: paymentStatus.optional(),
  paymentReference: z.string().trim().max(200).nullable().optional(),
  reason: z.string().trim().max(300).optional(),
})

export const transitionSubscriptionInputSchema = z.object({
  subscriptionId: uuidId,
  toStatus: z.enum(['active', 'grace', 'expired', 'cancelled', 'suspended'] as const satisfies readonly SubscriptionStatus[]),
  reason: z.string().trim().max(300).optional(),
  graceUntil: isoDate.nullable().optional(),
  paymentStatus: paymentStatus.optional(),
  paymentReference: z.string().trim().max(200).nullable().optional(),
  nextBillingAt: isoDate.nullable().optional(),
})

export const subscriptionModeInputSchema = z.object({
  mode: z.enum(['purchases_only', 'subscriptions_only', 'hybrid']),
  gracePeriodDays: z.number().int().min(0).max(90),
})

export const studentSearchQuerySchema = z.string().trim().max(120)

export const createSubscriptionRequestInputSchema = z.object({
  planId: uuidId,
  method: z.string().trim().min(1, 'وسيلة الدفع مطلوبة').max(64),
  reference: z.string().trim().max(120).optional(),
  receiptUrl: z.string().trim().min(4, 'صورة الإيصال مطلوبة').max(600),
  note: z.string().trim().max(500).optional(),
})

export const requestIdSchema = uuidId

/** يحوّل أخطاء Zod إلى رسالة عربية واضحة بأول حقل مخل. */
export function firstIssueMessage(error: z.ZodError): string {
  const issue = error.issues[0]
  const path = issue?.path?.join('.') ?? ''
  return `بيانات غير صالحة${path ? ` (${path})` : ''}: ${issue?.message ?? 'قيمة مرفوضة'}`
}

import { prisma } from '@/lib/prisma'
import {
  getExamSubscriptionAccessState,
  getSubscriptionAccessState,
  getSubscriptionMode,
} from '@/lib/subscription-access'

export type ContentAccessSource = 'purchase' | 'subscription'

export type ContentAccessResult = {
  allowed: boolean
  source: ContentAccessSource | null
  subscriptionIds: string[]
  graceActive: boolean
}

export type ContentAccessTarget =
  | { kind: 'lecture'; lectureId: string }
  | { kind: 'exam'; stageId: string | null; branchId: string | null }

/**
 * INVARIANT — العقد الأساسي للنظام:
 * "انتهاء الاشتراك لا يُبطل أبدًا المشتريات (الطلبات المعتمدة) السابقة. المشتريات دائمة."
 * An expired subscription NEVER revokes previously approved purchases.
 *
 * هذه هي البوابة الموحّدة لقرارات وصول المحتوى (محاضرات وامتحانات):
 * - تُقيّم subscription_mode أولًا.
 * - purchases_only: الاشتراكات لا تفتح شيئًا؛ المشتريات فقط.
 * - subscriptions_only: المشتريات تُتجاهل؛ الاشتراكات الصالحة فقط.
 * - hybrid: أي من المصدرين يكفي.
 * ممنوع إعادة تنفيذ هذا المنطق في أي باب آخر — استدعِ هذه الدالة.
 */
function toResult(
  state: Awaited<ReturnType<typeof getSubscriptionAccessState>>,
): ContentAccessResult {
  if (!state.allowed) {
    return { allowed: false, source: null, subscriptionIds: [], graceActive: false }
  }
  return {
    allowed: true,
    source: 'subscription',
    subscriptionIds: state.subscriptionIds,
    graceActive: state.graceActive,
  }
}

export async function checkContentAccess(
  userId: string,
  target: ContentAccessTarget,
): Promise<ContentAccessResult> {
  const denied: ContentAccessResult = { allowed: false, source: null, subscriptionIds: [], graceActive: false }
  const mode = await getSubscriptionMode()

  if (target.kind === 'exam') {
    // الامتحانات ترتبط بفرع/مرحلة فقط (model exams). مسار الشراء القديم للامتحانات
    // يبقى داخل app/student/exams/actions.ts كما هو دون تغيير؛ هنا يُحسم جانب الاشتراكات.
    if (mode === 'purchases_only') return denied
    return toResult(await getExamSubscriptionAccessState(userId, { stage_id: target.stageId, branch_id: target.branchId }))
  }

  const lecture = await prisma.lectures.findUnique({
    where: { id: target.lectureId },
    select: {
      id: true,
      branch_id: true,
      monthly_course_id: true,
      monthly_courses: { select: { term_id: true } },
    },
  })

  if (!lecture) return denied

  const orders = mode === 'subscriptions_only'
    ? []
    : await prisma.orders.findMany({
    where: { student_id: userId, status: 'approved' },
    select: {
      order_items: {
        select: {
          lecture_id: true,
          monthly_course_id: true,
          term_id: true,
          item_type: true,
        },
      },
    },
  })

  for (const order of orders) {
    for (const item of order.order_items) {
      if (item.lecture_id === target.lectureId) {
        return { allowed: true, source: 'purchase', subscriptionIds: [], graceActive: false }
      }
      if (
        lecture.monthly_course_id &&
        item.item_type === 'course_bundle' &&
        item.monthly_course_id === lecture.monthly_course_id
      ) {
        return { allowed: true, source: 'purchase', subscriptionIds: [], graceActive: false }
      }
      if (
        lecture.monthly_courses?.term_id &&
        item.item_type === 'term_bundle' &&
        item.term_id === lecture.monthly_courses.term_id
      ) {
        return { allowed: true, source: 'purchase', subscriptionIds: [], graceActive: false }
      }
    }
  }

  if (mode === 'purchases_only') return denied
  return toResult(await getSubscriptionAccessState(userId, target.lectureId))
}

/**
 * الوصول للمحاضرة مشتق من مصدرين مستقلين:
 * 1) طلب approved يملك المحاضرة أو الكورس أو الترم.
 * 2) اشتراك صالح يطابق نطاق المحاضرة.
 * انتهاء الاشتراك لا يحذف ولا يلغي المشتريات السابقة.
 */
export async function userCanAccessLecture(
  userId: string,
  lectureId: string,
): Promise<boolean> {
  const result = await checkContentAccess(userId, { kind: 'lecture', lectureId })
  return result.allowed
}

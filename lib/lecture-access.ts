import { prisma } from '@/lib/prisma'
import { getSubscriptionAccessState, getSubscriptionMode } from '@/lib/subscription-access'

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
  const mode = await getSubscriptionMode()
  const lecture = await prisma.lectures.findUnique({
    where: { id: lectureId },
    select: {
      id: true,
      branch_id: true,
      monthly_course_id: true,
      monthly_courses: { select: { term_id: true } },
    },
  })

  if (!lecture) return false

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
      if (item.lecture_id === lectureId) return true
      if (
        lecture.monthly_course_id &&
        item.item_type === 'course_bundle' &&
        item.monthly_course_id === lecture.monthly_course_id
      ) return true
      if (
        lecture.monthly_courses?.term_id &&
        item.item_type === 'term_bundle' &&
        item.term_id === lecture.monthly_courses.term_id
      ) return true
    }
  }

  if (mode === 'purchases_only') return false
  const subscription = await getSubscriptionAccessState(userId, lectureId)
  return subscription.allowed
}

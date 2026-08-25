import { prisma } from '@/lib/prisma'
import { computeSubscriptionStatus } from '@/lib/subscription-access'
import { subscriptionExpiryWindow } from '@/lib/notifications-data'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Expiry sweeper — يُستدعى يوميًا عبر Vercel Cron (راجع vercel.json).
 * 1) يقلب active -> expired بعد تجاوز نهاية الاشتراك وفترة السماح،
 *    ويكتب حدث expired لكل صف داخل نفس المعاملة (R2.5).
 * 2) يرسل إشعارات الطلاب المفتاحية غير القابلة للتكرار:
 *    قبل الانتهاء بـ7 أيام ويوم، عند بدء فترة السماح، وعند الانتهاء النهائي —
 *    كل إشعار بمفتاح فريد مشتق من (الاشتراك، النافذة) وفحص وجود قبل الإدراج.
 * ملاحظة: قرار الوصول لا يعتمد أبدًا على هذه الحالة — التواريخ هي الفيصل؛
 * هذا التنظيف للعرض والتقارير والإشعارات فقط.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (process.env.NODE_ENV !== 'development' || secret) {
    const authHeader = req.headers.get('authorization')
    if (!secret || authHeader !== `Bearer ${secret}`) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const now = new Date()
  const settings = await prisma.platform_settings.findFirst({
    select: { grace_period_days: true },
  })
  const gracePeriodDays = settings?.grace_period_days ?? 3

  const swept = await prisma.$transaction(async (tx) => {
    // ---- 1) قلب الحالة المنتهية نهائيًا ----
    const candidates = await tx.student_subscriptions.findMany({
      where: { status: 'active', end_date: { lt: now } },
      select: { id: true, student_id: true, end_date: true, grace_until: true, plans: { select: { title: true } } },
    })

    const toExpire = candidates.filter(
      (row) => computeSubscriptionStatus(row, gracePeriodDays, now) === 'expired',
    )

    if (toExpire.length > 0) {
      await tx.student_subscriptions.updateMany({
        where: { id: { in: toExpire.map((row) => row.id) }, status: 'active' },
        data: { status: 'expired', updated_at: now },
      })
      await tx.subscription_events.createMany({
        data: toExpire.map((row) => ({
          subscription_id: row.id,
          event_type: 'expired',
          from_status: 'active',
          to_status: 'expired',
          reason: 'انتهاء تلقائي بمرور مدة الاشتراك وفترة السماح',
          metadata: {
            sweptAt: now.toISOString(),
            endDate: row.end_date.toISOString(),
            graceUntil: row.grace_until ? row.grace_until.toISOString() : null,
            gracePeriodDays,
          },
        })),
      })
    }

    // ---- 2) إشعارات مفتاحية (idempotent by (subscription_id, window)) ----
    async function pushNotice(
      subscriptionId: string,
      studentId: string,
      planTitle: string,
      windowKey: 't-7d' | 't-1d' | 'grace' | 'expired',
      remainingDays?: number,
    ): Promise<boolean> {
      const code = `SUBEXP-${subscriptionId}-${windowKey}`
      const exists = await tx.notifications.findUnique({ where: { code }, select: { id: true } })
      if (exists) return false

      const renewHint = 'للتجديد: صفحة «اشتراكاتي» /student/subscriptions'
      const content = {
        't-7d': {
          title: 'اشتراكك ينتهي قريبًا',
          description: `خطة «${planTitle}» تنتهي بعد ${remainingDays ?? 7} يوم تقريبًا. جدّد الآن لتفادي توقف الوصول. ${renewHint}`,
        },
        't-1d': {
          title: 'اشتراكك ينتهي غدًا',
          description: `خطة «${planTitle}» تنتهي خلال يوم واحد. جدّد الآن لتفادي توقف الوصول. ${renewHint}`,
        },
        grace: {
          title: 'فترة السماح بدأت — جدّد الآن',
          description: `انتهت مدة خطة «${planTitle}» وأنت الآن داخل فترة السماح (${gracePeriodDays} يومًا). المحتوى ما زال متاحًا حتى نهايتها. ${renewHint}`,
        },
        expired: {
          title: 'انتهى اشتراكك',
          description: `انتهت صلاحية اشتراك خطة «${planTitle}». مشترياتك السابقة بالشراء الفردي تبقى ملكك دائمًا. ${renewHint}`,
        },
      }[windowKey]

      await tx.notifications.create({
        data: {
          code,
          type: 'دفع',
          title: content.title,
          description: content.description,
          read: false,
          students: { connect: { id: studentId } },
        },
      })
      return true
    }

    let notified = 0

    // انتهاء نهائي — للصفوف التي قُلبت في هذا التشغيل
    for (const row of toExpire) {
      if (await pushNotice(row.id, row.student_id, row.plans.title, 'expired')) notified++
    }

    // دخول فترة السماح: لا تزال active لكن داخل السماح بالتواريخ
    const inGrace = candidates.filter(
      (row) => computeSubscriptionStatus(row, gracePeriodDays, now) === 'grace'
    )
    for (const row of inGrace) {
      if (await pushNotice(row.id, row.student_id, row.plans.title, 'grace')) notified++
    }

    // تحذيرات ما قبل الانتهاء (7 أيام / يوم)
    const activeSoon = await tx.student_subscriptions.findMany({
      where: { status: 'active', end_date: { gt: now } },
      select: { id: true, student_id: true, end_date: true, plans: { select: { title: true } } },
    })
    for (const row of activeSoon) {
      const windowKey = subscriptionExpiryWindow(row.end_date, now)
      if (!windowKey) continue
      if (await pushNotice(row.id, row.student_id, row.plans.title, windowKey)) notified++
    }

    return { swept: toExpire.length, notified }
  })

  return Response.json(swept)
}

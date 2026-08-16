'use server'
import { logError } from '@/lib/logger'

import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-guard'
import { logActivity } from '@/lib/audit-log'
import { auth } from '@/auth'

const WIPE_PASSWORD = '000000'

export async function wipeAllData(password: string) {
  if (!(await requireAdmin())) {
    return { error: 'غير مسموح. لازم تكون أدمن كامل الصلاحيات.' }
  }

  if (password !== WIPE_PASSWORD) {
    return { error: 'كلمة المرور غير صحيحة.' }
  }

  const session = await auth()
  const user = session?.user
  if (!user) {
    return { error: 'انتهت الجلسة. سجّل الدخول من جديد وحاول تاني.' }
  }

  await logActivity({
    action: 'delete',
    resource: 'settings',
    targetLabel: 'مسح كل بيانات الموقع (Danger Zone)',
  }).catch(() => {})

  try {
    // 1. Delete all student users (this cascades to profiles, students, enrollments, etc.)
    const studentProfiles = await prisma.profiles.findMany({
      where: { role: 'student' },
      select: { id: true }
    })
    const studentIds = studentProfiles.map(p => p.id)
    
    if (studentIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: studentIds } }
      })
    }

    // 2. Truncate all domain tables CASCADE
    await prisma.$executeRawUnsafe(`
      TRUNCATE TABLE 
        public.categories, 
        public.stages, 
        public.branches, 
        public.courses, 
        public.monthly_courses, 
        public.cart_items,
        public.orders,
        public.payments,
        public.certificates,
        public.coupons,
        public.messages,
        public.notifications,
        public.activity_logs,
        public.auth_logs,
        public.notification_reads
      CASCADE;
    `)

    return { success: true }
  } catch (error: any) {
    logError('wipeAllData', error)
    return { error: 'تعذّر مسح البيانات: ' + error.message }
  }
}

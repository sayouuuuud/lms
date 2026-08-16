'use server'

import { logAuthEvent, getRequestMeta } from '@/lib/audit-log'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

/**
 * Resolves where a freshly signed-in user should land. The role is read from the
 * database on the server (the client-side session can still be warming up right
 * after `signIn`, which used to send admins to the student portal by mistake).
 */
export async function resolveLoginDestination(): Promise<
  { destination: string } | { error: 'unresolved' | 'suspended' }
> {
  const session = await auth()
  const user = session?.user as any
  if (!user?.id) return { error: 'unresolved' }

  const profile = await prisma.profiles.findUnique({
    where: { id: user.id },
    select: { role: true },
  })

  const role = profile?.role ?? user.role ?? 'student'
  if (role === 'admin' || role === 'assistant') {
    return { destination: '/admin/dashboard' }
  }

  const student = await prisma.students.findFirst({
    where: { user_id: user.id },
    select: { status: true },
  })
  if (student?.status === 'موقوف') return { error: 'suspended' }

  return { destination: '/student' }
}

export async function recordLogin(): Promise<void> {
  try {
    const session = await auth()
    const user = session?.user as any
    if (!user) return

    const profile = await prisma.profiles.findUnique({
      where: { id: user.id },
      select: { full_name: true, role: true }
    })

    if (!profile) return
    const role = profile.role as string
    if (role !== 'admin' && role !== 'assistant') return

    const { ip, userAgent } = await getRequestMeta()

    await logAuthEvent({
      event: 'login',
      actorId: user.id,
      actorName: profile.full_name ?? 'غير معروف',
      actorRole: role,
      ip: ip ?? undefined,
      userAgent: userAgent ?? undefined,
    })
  } catch {
    // silent
  }
}

export async function recordLogout(): Promise<void> {
  try {
    const session = await auth()
    const user = session?.user as any
    if (!user) return

    const profile = await prisma.profiles.findUnique({
      where: { id: user.id },
      select: { full_name: true, role: true }
    })

    if (!profile) return
    const role = profile.role as string
    if (role !== 'admin' && role !== 'assistant') return

    const { ip, userAgent } = await getRequestMeta()

    await logAuthEvent({
      event: 'logout',
      actorId: user.id,
      actorName: profile.full_name ?? 'غير معروف',
      actorRole: role,
      ip: ip ?? undefined,
      userAgent: userAgent ?? undefined,
    })
  } catch {
    // silent
  }
}

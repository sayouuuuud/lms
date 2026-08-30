import { prisma } from '@/lib/prisma'
import { logError } from '@/lib/logger'

/**
 * Checks whether public pages should fetch dynamic data from PostgreSQL database
 * or use the complete static fallback dataset (legacy version).
 * Default is `true` (dynamic database sync enabled).
 */
export async function isPublicSyncWithDbEnabled(): Promise<boolean> {
  try {
    const settings = await prisma.platform_settings.findFirst({
      select: { sync_public_with_db: true }
    })
    return settings?.sync_public_with_db ?? true
  } catch (err) {
    if (
      err &&
      typeof err === 'object' &&
      'digest' in err &&
      typeof (err as any).digest === 'string' &&
      ((err as any).digest === 'DYNAMIC_SERVER_USAGE' ||
        (err as any).digest.startsWith('NEXT_'))
    ) {
      throw err
    }
    logError('isPublicSyncWithDbEnabled', err)
    return true
  }
}

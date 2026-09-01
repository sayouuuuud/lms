import { cache } from 'react'
import { prisma } from './prisma.ts'
import { logError } from './logger.ts'

let cachedSyncSetting: { value: boolean; timestamp: number } | null = null
const CACHE_TTL_MS = 10_000 // 10 seconds cache

/**
 * Checks whether public pages should fetch dynamic data from PostgreSQL database
 * or use the complete static fallback dataset (legacy version).
 * Default is `true` (dynamic database sync enabled).
 */
export const isPublicSyncWithDbEnabled = cache(async function isPublicSyncWithDbEnabled(): Promise<boolean> {
  const now = Date.now()
  if (cachedSyncSetting && now - cachedSyncSetting.timestamp < CACHE_TTL_MS) {
    return cachedSyncSetting.value
  }

  try {
    const settings = await prisma.platform_settings.findFirst({
      select: { sync_public_with_db: true }
    })
    const value = settings?.sync_public_with_db ?? true
    cachedSyncSetting = { value, timestamp: now }
    return value
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
    return cachedSyncSetting?.value ?? true
  }
})


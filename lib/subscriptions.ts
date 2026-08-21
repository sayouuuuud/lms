import { hasUsableSubscription } from '@/lib/subscription-access'

export async function hasActiveSubscription(userId: string): Promise<boolean> {
  return hasUsableSubscription(userId)
}

export const isReleasedFilter = {
  is_published: true,
  OR: [
    { release_date: null },
    { release_date: { lte: new Date() } },
  ],
}

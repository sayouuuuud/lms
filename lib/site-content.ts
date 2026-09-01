import { logError } from './logger.ts'
import { prisma } from './prisma.ts'
import { isPublicSyncWithDbEnabled } from './platform-settings.ts'
import {
  DEFAULT_SITE_CONTENT,
  deepMerge,
  type SiteContent,
  type HeroContent,
  type FeaturesContent,
  type StatsContent,
  type TestimonialsContent,
  type CtaContent,
  type FooterContent,
  type NavbarContent,
  type SeoContent,
  type LoginPanelContent,
  type StageOfferContent,
  type PaymentAccountsContent,
} from './site-content-defaults.ts'

export { DEFAULT_SITE_CONTENT }
export type {
  SiteContent,
  HeroContent,
  FeaturesContent,
  StatsContent,
  TestimonialsContent,
  CtaContent,
  FooterContent,
  NavbarContent,
  SeoContent,
  LoginPanelContent,
  LoginPanelStat,
  StageOfferContent,
  FeatureItem,
  StatItem,
  TestimonialItem,
  JourneyPoint,
  FooterLink,
  PaymentAccountsContent,
  PaymentAccountItem,
} from '@/lib/site-content-defaults'

import { cache } from 'react'

let cachedSiteContent: { value: SiteContent; timestamp: number } | null = null
const CONTENT_CACHE_TTL_MS = 10_000 // 10 seconds cache

export const getSiteContent = cache(async function getSiteContent(): Promise<SiteContent> {
  const now = Date.now()
  if (cachedSiteContent && now - cachedSiteContent.timestamp < CONTENT_CACHE_TTL_MS) {
    return cachedSiteContent.value
  }

  try {
    const isSyncEnabled = await isPublicSyncWithDbEnabled()
    if (!isSyncEnabled) {
      return DEFAULT_SITE_CONTENT
    }

    const data = await prisma.site_content.findMany({
      select: { section: true, value: true }
    })

    if (!data || data.length === 0) {
      cachedSiteContent = { value: DEFAULT_SITE_CONTENT, timestamp: now }
      return DEFAULT_SITE_CONTENT
    }

    const dbMap: Record<string, unknown> = {}
    for (const row of data) {
      dbMap[row.section] = row.value
    }

    const result: SiteContent = {
      hero:         deepMerge(DEFAULT_SITE_CONTENT.hero,         (dbMap.hero         ?? {}) as Partial<HeroContent>),
      features:     deepMerge(DEFAULT_SITE_CONTENT.features,     (dbMap.features     ?? {}) as Partial<FeaturesContent>),
      stats:        deepMerge(DEFAULT_SITE_CONTENT.stats,        (dbMap.stats        ?? {}) as Partial<StatsContent>),
      testimonials: deepMerge(DEFAULT_SITE_CONTENT.testimonials, (dbMap.testimonials ?? {}) as Partial<TestimonialsContent>),
      cta:          deepMerge(DEFAULT_SITE_CONTENT.cta,          (dbMap.cta          ?? {}) as Partial<CtaContent>),
      footer:       deepMerge(DEFAULT_SITE_CONTENT.footer,       (dbMap.footer       ?? {}) as Partial<FooterContent>),
      navbar:       deepMerge(DEFAULT_SITE_CONTENT.navbar,       (dbMap.navbar       ?? {}) as Partial<NavbarContent>),
      seo:          deepMerge(DEFAULT_SITE_CONTENT.seo,          (dbMap.seo          ?? {}) as Partial<SeoContent>),
      login_panel:  deepMerge(DEFAULT_SITE_CONTENT.login_panel,  (dbMap.login_panel  ?? {}) as Partial<LoginPanelContent>),
      stage_offer:  deepMerge(DEFAULT_SITE_CONTENT.stage_offer,  (dbMap.stage_offer  ?? {}) as Partial<StageOfferContent>),
      payment_accounts: deepMerge(DEFAULT_SITE_CONTENT.payment_accounts, (dbMap.payment_accounts ?? {}) as Partial<PaymentAccountsContent>),
    }

    cachedSiteContent = { value: result, timestamp: now }
    return result
  } catch (err) {
    if (
      err &&
      typeof err === 'object' &&
      'digest' in err &&
      typeof (err as { digest?: unknown }).digest === 'string' &&
      ((err as { digest: string }).digest === 'DYNAMIC_SERVER_USAGE' ||
        (err as { digest: string }).digest.startsWith('NEXT_'))
    ) {
      throw err
    }
    logError('getSiteContent', err)
    return cachedSiteContent?.value ?? DEFAULT_SITE_CONTENT
  }
})

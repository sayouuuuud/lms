'use client'

import { LandingNavbar } from './landing-navbar'
import { HeroSection } from './hero-section'
import { WaveDivider } from '@/components/wave-divider'
import { FeaturesSection } from './features-section'
import { StagesSection } from './stages-section'
import { StatsSection } from './stats-section'
import { CtaSection } from './cta-section'
import { TestimonialsSection } from './testimonials-section'
import { SiteFooter } from './site-footer'
import { ScrollRefresh } from './scroll-refresh'
import type { Stage } from '@/lib/landing-data'
import type { PublicSubscriptionPlan } from '@/lib/subscription-public'
import { PublicSubscriptionStrip } from '@/components/subscriptions/public-subscription-strip'
import type { SiteContent } from '@/lib/site-content-defaults'
import { DEFAULT_SITE_CONTENT } from '@/lib/site-content-defaults'

export function LandingPage({
  stages = [],
  isLoggedIn = false,
  siteContent = DEFAULT_SITE_CONTENT,
  subscriptionPlans = [],
}: {
  stages?: Stage[]
  isLoggedIn?: boolean
  siteContent?: SiteContent
  subscriptionPlans?: PublicSubscriptionPlan[]
}) {
  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <ScrollRefresh />
      <div className="relative z-10">
        <LandingNavbar isLoggedIn={isLoggedIn} content={siteContent.navbar} />
        <main>
          <HeroSection content={siteContent.hero} />
          <WaveDivider />
          <PublicSubscriptionStrip plans={subscriptionPlans} title="اشتراك واحد لمحتوى أكثر" subtitle="اختَر السنة والفرع والخطة المناسبة من صفحة الاشتراكات، واعرف بالضبط ما الذي تفتحه الخطة وكم تستمر." />
          <FeaturesSection content={siteContent.features} />
          <StagesSection stages={stages} />
          <StatsSection content={siteContent.stats} />
          <TestimonialsSection content={siteContent.testimonials} />
          <CtaSection content={siteContent.cta} />
        </main>
        <SiteFooter content={siteContent.footer} />
      </div>
    </div>
  )
}

'use client'

import { motion, type Variants } from 'framer-motion'
import { LandingNavbar } from './landing-navbar'
import { HeroSection } from './hero-section'
import { FeaturesSection } from './features-section'
import { StagesSection } from './stages-section'
import { StatsSection } from './stats-section'
import { TestimonialsSection } from './testimonials-section'
import { CtaSection } from './cta-section'
import { SiteFooter } from './site-footer'
import { ScrollRefresh } from './scroll-refresh'
import type { Stage } from '@/lib/landing-data'
import type { SiteContent } from '@/lib/site-content-defaults'
import { DEFAULT_SITE_CONTENT } from '@/lib/site-content-defaults'
import type { PublicSubscriptionPlan } from '@/lib/subscription-public'
import { PublicSubscriptionStrip } from '@/components/subscriptions/public-subscription-strip'

const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
}

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
    <div className="relative min-h-screen bg-[#fbfaf6] text-navy transition-colors duration-300 dark:bg-[#0a0f1a] dark:text-slate-100">
      <ScrollRefresh />

      {/* Molecular Lattice dot-grid (Clean, crisp atomic dot grid in light mode & neon in dark mode) */}
      <div
        className="graph-paper pointer-events-none fixed inset-0 z-0 opacity-80 dark:opacity-50 transition-opacity duration-300"
        aria-hidden="true"
      />

      {/* Light Mode Chemistry Warm Ambient Glow */}
      <div
        className="pointer-events-none fixed inset-0 z-0 dark:hidden"
        aria-hidden="true"
        style={{
          background: [
            'radial-gradient(70rem 50rem at 80% 0%, rgba(218, 173, 76, 0.07) 0%, transparent 55%)',
            'radial-gradient(50rem 40rem at 5% 90%, rgba(217, 119, 6, 0.06) 0%, transparent 50%)',
            'radial-gradient(35rem 25rem at 50% 50%, rgba(13, 148, 136, 0.04) 0%, transparent 45%)',
          ].join(', '),
        }}
      />

      {/* Dark Mode Chemistry Neon Ambient Glow — Emerald top-right, Violet bottom-left, Cyan mid */}
      <div
        className="pointer-events-none fixed inset-0 z-0 hidden dark:block"
        aria-hidden="true"
        style={{
          background: [
            'radial-gradient(70rem 50rem at 80% 0%, #daad4c22 0%, transparent 55%)',
            'radial-gradient(50rem 40rem at 5% 90%, #daad4c22 0%, transparent 50%)',
            'radial-gradient(35rem 25rem at 50% 50%, #06b6d41a 0%, transparent 45%)',
          ].join(', '),
        }}
      />

      <div className="relative z-10">
        <LandingNavbar isLoggedIn={isLoggedIn} content={siteContent.navbar} />
        <main>
          <HeroSection content={siteContent.hero} />

          {subscriptionPlans.length > 0 && (
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeInUp}>
              <PublicSubscriptionStrip
                plans={subscriptionPlans}
                title="اشتراك واحد لمحتوى أكثر"
                subtitle="اختَر السنة والفرع والخطة المناسبة من صفحة الاشتراكات، واعرف بالضبط ما الذي تفتحه الخطة وكم تستمر."
              />
            </motion.div>
          )}

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeInUp}>
            <FeaturesSection content={siteContent.features} />
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeInUp}>
            <StagesSection stages={stages} />
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeInUp}>
            <StatsSection content={siteContent.stats} />
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeInUp}>
            <TestimonialsSection content={siteContent.testimonials} />
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeInUp}>
            <CtaSection content={siteContent.cta} />
          </motion.div>
        </main>
        <SiteFooter content={siteContent.footer} />
      </div>
    </div>
  )
}


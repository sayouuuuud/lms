'use client'

import { motion } from 'framer-motion'
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

const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } }
}

export function LandingPage({ stages = [] }: { stages?: Stage[] }) {
  return (
    <div className="relative min-h-screen bg-cream dark:bg-ink-base">
      <ScrollRefresh />
      {/* Continuous graph-paper backdrop behind every section */}
      <div
        className="graph-paper pointer-events-none fixed inset-0 z-0 opacity-[0.45] dark:opacity-[0.22]"
        aria-hidden="true"
      />
      {/* Dark-mode ambient glow — teal on the right, violet on the left */}
      <div
        className="pointer-events-none fixed inset-0 z-0 hidden dark:block"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(60rem 40rem at 78% 12%, oklch(0.84 0.13 184 / 0.12), transparent 60%), radial-gradient(48rem 36rem at 12% 82%, oklch(0.66 0.2 292 / 0.12), transparent 60%)',
        }}
      />
      <div className="relative z-10">
        <LandingNavbar />
        <main>
          <HeroSection />
          
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeInUp}>
            <FeaturesSection />
          </motion.div>
          
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeInUp}>
            <StagesSection stages={stages} />
          </motion.div>
          
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeInUp}>
            <StatsSection />
          </motion.div>
          
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeInUp}>
            <TestimonialsSection />
          </motion.div>
          
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeInUp}>
            <CtaSection />
          </motion.div>
        </main>
        <SiteFooter />
      </div>
    </div>
  )
}

import { LandingNavbar } from './landing-navbar'
import { HeroSection } from './hero-section'
import { FeaturesSection } from './features-section'
import { StagesSection } from './stages-section'
import { StatsSection } from './stats-section'
import { TestimonialsSection } from './testimonials-section'
import { CtaSection } from './cta-section'
import { SiteFooter } from './site-footer'
import { ScrollRefresh } from './scroll-refresh'

export function LandingPage() {
  return (
    <div className="relative min-h-screen bg-cream">
      <ScrollRefresh />
      {/* Continuous graph-paper backdrop behind every section */}
      <div
        className="graph-paper pointer-events-none fixed inset-0 z-0 opacity-[0.45]"
        aria-hidden="true"
      />
      <div className="relative z-10">
        <LandingNavbar />
        <main>
          <HeroSection />
          <FeaturesSection />
          <StagesSection />
          <StatsSection />
          <TestimonialsSection />
          <CtaSection />
        </main>
        <SiteFooter />
      </div>
    </div>
  )
}

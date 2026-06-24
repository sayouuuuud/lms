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
    <div className="min-h-screen bg-cream">
      <ScrollRefresh />
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
  )
}

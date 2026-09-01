'use client'

import { AnimatedNumber } from './animated-number'
import type { StatsContent } from '@/lib/site-content-defaults'
import { DEFAULT_SITE_CONTENT } from '@/lib/site-content-defaults'

export function StatsSection({ content = DEFAULT_SITE_CONTENT.stats }: { content?: StatsContent }) {
  return (
    <section id="stats" className="relative overflow-hidden bg-navy py-20 md:py-28 dark:bg-[#070d1a] dark:border-y dark:border-white/5">
      {/* Chemistry lab glow overlays — purple for dark mode, purple tint for light */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          background: 'radial-gradient(ellipse 60% 50% at 90% 20%, oklch(0.66 0.2 292 / 0.18) 0%, transparent 55%), radial-gradient(ellipse 40% 35% at 0% 80%, oklch(0.84 0.13 184 / 0.12) 0%, transparent 50%)',
        }}
      />
      {/* Floating molecular formula decorations */}
      <span className="pointer-events-none absolute right-6 top-12 font-mono text-2xl font-bold text-white/8 dark:text-teal-glow/15 select-none" aria-hidden="true">H₂SO₄</span>
      <span className="pointer-events-none absolute left-4 bottom-16 font-mono text-3xl font-bold text-white/8 dark:text-purple-glow/15 select-none" aria-hidden="true">CH₃COOH</span>
      <span className="pointer-events-none absolute right-16 bottom-8 font-mono text-xl font-bold text-white/6 dark:text-teal-glow/10 select-none" aria-hidden="true">Fe₂O₃</span>

      <div className="relative mx-auto max-w-7xl px-5 md:px-8">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <span className="text-sm font-semibold text-gold dark:text-teal-glow">
            <span className="font-mono">{'// '}</span>
            {content.badge}
          </span>
          <h2 className="font-thmanyah font-bold mt-3 text-balance text-3xl leading-tight text-cream sm:text-4xl lg:text-5xl">
            {content.title}
          </h2>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-cream/70">
            {content.description}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-3xl border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
          {content.items.map((s) => (
            <div key={s.label} className="bg-white/5 p-8 backdrop-blur md:p-10 dark:bg-[#0f172a]/75">
              <div className="flex items-baseline gap-1 text-cream">
                <span className="stat-num font-thmanyah text-5xl font-bold md:text-4xl lg:text-5xl xl:text-6xl">
                  <AnimatedNumber value={s.value} duration={2.5} />
                </span>
                <span className="font-thmanyah text-3xl font-bold text-gold md:text-2xl lg:text-3xl xl:text-4xl dark:text-brand">
                  {s.suffix === '+' ? '+' : s.suffix === '%' ? '٪' : s.suffix === 'k' ? ' ألف' : s.suffix}
                </span>
              </div>
              <div className="mt-3 text-sm font-medium text-cream/60 md:text-base">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}


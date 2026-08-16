'use client'

import { AnimatedNumber } from './animated-number'
import { useReveal } from '@/lib/use-reveal'
import { TopographicBackground } from '@/components/topo-background'

export function StatsSection({ content }: { content?: any }) {
  const headRef = useReveal<HTMLDivElement>(undefined, { y: 30 })
  const gridRef = useReveal<HTMLDivElement>(undefined, { y: 40 })

  if (!content) return null

  return (
    <section id="stats" className="relative overflow-hidden bg-[#F5F0E6] dark:bg-[#0A0703] py-14 sm:py-20 md:py-28">
      <TopographicBackground />
      <div className="mx-auto max-w-7xl px-4 sm:px-5 md:px-8 relative z-10">
        <div ref={headRef} className="mx-auto mb-10 max-w-2xl text-center sm:mb-12">
          <span className="text-sm font-bold tracking-widest text-gold uppercase" style={{ fontFamily: 'var(--font-cairo)' }}>
            {content.badge}
          </span>
          <h2 className="mt-3 text-balance text-[clamp(1.5rem,6.5vw,1.875rem)] font-black leading-tight text-[#2B2114] dark:text-[#FAF8F5] sm:text-4xl lg:text-5xl" style={{ fontFamily: 'var(--font-aref-ruqaa), serif' }}>
            {content.title}
          </h2>
          <p className="mt-4 text-pretty text-base leading-relaxed text-[#2B2114]/70 sm:text-lg dark:text-[#FAF8F5]/70">
            {content.description}
          </p>
        </div>

        <div
          ref={gridRef}
          className="grid grid-cols-1 gap-px overflow-hidden rounded-3xl border border-gold/20 bg-gold/10 sm:grid-cols-2 lg:grid-cols-4"
        >
          {content.items?.map((s: any) => (
            <div key={s.label} className="bg-[#FBF7EF] dark:bg-[#110E0A] p-6 backdrop-blur sm:p-8 md:p-10">
              <div className="flex items-baseline gap-1 text-[#2B2114] dark:text-[#FAF8F5]">
                <span className="text-4xl font-black tabular-nums sm:text-5xl md:text-4xl lg:text-5xl xl:text-6xl">
                  <AnimatedNumber value={s.value} duration={2200} />
                </span>
                <span className="text-2xl font-black text-gold sm:text-3xl md:text-2xl lg:text-3xl xl:text-4xl">
                  {s.suffix === '+' ? '+' : s.suffix === '%' ? '٪' : s.suffix}
                </span>
              </div>
              <p className="mt-3 text-pretty text-sm leading-relaxed text-[#2B2114]/70 sm:text-base dark:text-[#FAF8F5]/70 font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

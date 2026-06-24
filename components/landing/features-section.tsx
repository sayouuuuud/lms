'use client'

import { Lightbulb, ClipboardCheck, Video, LineChart } from 'lucide-react'
import { features } from '@/lib/landing-data'
import { useReveal } from '@/lib/use-reveal'

const iconMap = {
  lightbulb: Lightbulb,
  clipboard: ClipboardCheck,
  video: Video,
  chart: LineChart,
}

export function FeaturesSection() {
  const headRef = useReveal<HTMLDivElement>(undefined, { y: 30 })
  const gridRef = useReveal<HTMLDivElement>('.feature-card', { y: 50, duration: 0.6 })

  return (
    <section id="features" className="bg-cream py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div ref={headRef} className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-bold uppercase tracking-wide text-emerald-brand">
            ليه تختار منصتنا؟
          </span>
          <h2 className="mt-3 text-balance text-3xl font-extrabold text-navy md:text-4xl">
            كل اللي محتاجه عشان تتفوق في الرياضيات
          </h2>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-navy/60">
            منظومة تعليمية متكاملة صُمّمت بخبرة سنين عشان توصّلك لأعلى الدرجات
            بأقل مجهود.
          </p>
        </div>

        <div ref={gridRef} className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => {
            const Icon = iconMap[f.icon as keyof typeof iconMap]
            return (
              <div
                key={f.title}
                className="feature-card group relative overflow-hidden rounded-3xl border border-navy/10 bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:border-gold/40 hover:shadow-xl hover:shadow-navy/10"
              >
                <span className="absolute -right-6 -top-6 size-24 rounded-full bg-gold/10 transition-transform duration-500 group-hover:scale-150" />
                <span className="relative flex size-14 items-center justify-center rounded-2xl bg-navy text-gold shadow-lg shadow-navy/20">
                  <Icon className="size-7" />
                </span>
                <h3 className="relative mt-5 text-lg font-extrabold text-navy">
                  {f.title}
                </h3>
                <p className="relative mt-2 text-sm leading-relaxed text-navy/60">
                  {f.description}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

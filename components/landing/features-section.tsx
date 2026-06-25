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
  const listRef = useReveal<HTMLDivElement>('.feature-row', { y: 40, duration: 0.6 })

  return (
    <section id="features" className="relative py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div ref={headRef} className="max-w-2xl">
          <span className="text-sm font-semibold text-emerald-deep">
            <span className="font-mono">{'// '}</span>
            إزاي بنذاكر مع بعض
          </span>
          <h2 className="mt-3 text-balance text-3xl font-extrabold leading-tight text-navy sm:text-4xl lg:text-5xl">
            نظام تعليمي متكامل، مبني على خطوات واضحة.
          </h2>
          <p className="mt-5 text-pretty text-lg leading-relaxed text-ink-muted">
            مش مجرد فيديوهات؛ ده مسار متدرّج يمسكك من أول فكرة لحد ما تدخل الامتحان واثق
            من نفسك.
          </p>
        </div>

        <div ref={listRef} className="mt-14 border-t border-navy/10">
          {features.map((f) => {
            const Icon = iconMap[f.icon as keyof typeof iconMap]
            return (
              <div
                key={f.step}
                className="feature-row group grid grid-cols-[auto_1fr] items-start gap-5 border-b border-navy/10 py-8 transition-colors hover:bg-cream-deep/40 md:grid-cols-[6rem_3rem_1fr] md:items-center md:gap-8 md:px-4"
              >
                <span className="font-mono text-3xl font-black text-navy/15 transition-colors group-hover:text-gold md:text-5xl">
                  {f.step}
                </span>

                <span className="row-start-1 grid size-12 place-items-center rounded-xl bg-navy text-cream transition-transform duration-300 group-hover:-translate-y-1 md:row-auto">
                  <Icon className="size-6" />
                </span>

                <div className="col-span-2 md:col-span-1">
                  <h3 className="text-xl font-bold text-navy md:text-2xl">{f.title}</h3>
                  <p className="mt-2 max-w-2xl text-pretty leading-relaxed text-ink-muted">
                    {f.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

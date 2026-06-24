'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ArrowLeft, GraduationCap, BookOpen } from 'lucide-react'
import { stages } from '@/lib/landing-data'
import { cn } from '@/lib/utils'

gsap.registerPlugin(ScrollTrigger)

const accentStyles = {
  gold: {
    ring: 'hover:border-gold/50',
    chip: 'bg-gold/15 text-gold-deep',
    icon: 'bg-gold text-navy',
    glow: 'bg-gold/20',
  },
  emerald: {
    ring: 'hover:border-emerald-brand/50',
    chip: 'bg-emerald-brand/15 text-emerald-deep',
    icon: 'bg-emerald-brand text-white',
    glow: 'bg-emerald-brand/20',
  },
  navy: {
    ring: 'hover:border-navy/40',
    chip: 'bg-navy/10 text-navy',
    icon: 'bg-navy text-gold',
    glow: 'bg-navy/15',
  },
}

export function StagesSection() {
  const root = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      gsap.from('.stages-head', {
        scrollTrigger: { trigger: '.stages-head', start: 'top 85%' },
        y: 30,
        opacity: 0,
        duration: 0.7,
        ease: 'power3.out',
      })
      gsap.from('.stage-card', {
        scrollTrigger: { trigger: '.stages-grid', start: 'top 80%' },
        y: 60,
        opacity: 0,
        duration: 0.6,
        stagger: 0.12,
        ease: 'back.out(1.4)',
      })
    },
    { scope: root },
  )

  return (
    <section
      ref={root}
      id="stages"
      className="relative overflow-hidden bg-navy py-20 md:py-28"
    >
      {/* decorative grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 md:px-8">
        <div className="stages-head mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-gold/15 px-4 py-1.5 text-sm font-bold text-gold">
            <GraduationCap className="size-4" />
            اختر مرحلتك
          </span>
          <h2 className="mt-4 text-balance text-3xl font-extrabold text-cream md:text-4xl">
            انت في أنهي مرحلة دراسية؟
          </h2>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-cream/70">
            اختار صفك الدراسي وادخل على صفحة فيها كل المواد والكورسات مرتبة
            مخصوص ليك.
          </p>
        </div>

        <div className="stages-grid mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {stages.map((stage) => {
            const a = accentStyles[stage.accent]
            return (
              <Link
                key={stage.id}
                href={`/stages/${stage.id}`}
                className={cn(
                  'stage-card group relative flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-7 backdrop-blur-sm transition-all duration-300 hover:-translate-y-2 hover:bg-white/10',
                  a.ring,
                )}
              >
                <span
                  className={cn(
                    'absolute -left-8 -top-8 size-28 rounded-full blur-2xl transition-transform duration-500 group-hover:scale-150',
                    a.glow,
                  )}
                />
                <span
                  className={cn(
                    'relative flex size-14 items-center justify-center rounded-2xl shadow-lg',
                    a.icon,
                  )}
                >
                  <BookOpen className="size-7" />
                </span>

                <h3 className="relative mt-5 text-xl font-extrabold text-cream">
                  {stage.title}
                </h3>
                <p className="relative mt-2 text-sm leading-relaxed text-cream/60">
                  {stage.subtitle}
                </p>

                <div className="relative mt-4 flex flex-wrap gap-2">
                  {stage.grades.map((g) => (
                    <span
                      key={g}
                      className={cn(
                        'rounded-full px-3 py-1 text-xs font-bold',
                        a.chip,
                      )}
                    >
                      {g}
                    </span>
                  ))}
                </div>

                <span className="relative mt-6 inline-flex items-center gap-2 text-sm font-bold text-gold transition-transform group-hover:-translate-x-1">
                  ادخل المرحلة
                  <ArrowLeft className="size-4" />
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}

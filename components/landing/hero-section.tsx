'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import gsap from 'gsap'
import { ArrowLeft } from 'lucide-react'
import { FunctionCurve } from './function-curve'

const floatSymbols = [
  { char: 'π', top: '14%', right: '8%', size: 'text-5xl', color: 'text-emerald-brand' },
  { char: '√', top: '30%', left: '6%', size: 'text-4xl', color: 'text-gold-deep' },
  { char: 'Σ', bottom: '22%', left: '10%', size: 'text-5xl', color: 'text-navy/30' },
  { char: '∞', top: '20%', left: '24%', size: 'text-3xl', color: 'text-gold' },
  { char: 'x²', bottom: '30%', right: '7%', size: 'text-4xl', color: 'text-emerald-deep' },
  { char: '∫', top: '48%', right: '4%', size: 'text-5xl', color: 'text-navy/25' },
]

export function HeroSection() {
  const root = useRef<HTMLElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (reduce) {
        gsap.set(['.hero-stagger', '.hero-photo', '.hero-name'], { opacity: 1, y: 0 })
        return
      }

      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
      tl.from('.hero-name', { opacity: 0, y: 40, duration: 1 })
        .from('.hero-stagger', { opacity: 0, y: 28, duration: 0.7, stagger: 0.12 }, '-=0.6')
        .from('.hero-photo', { opacity: 0, y: 50, scale: 0.96, duration: 1 }, '-=0.9')

      gsap.utils.toArray<HTMLElement>('.float-sym').forEach((el, i) => {
        gsap.to(el, {
          y: i % 2 === 0 ? -18 : 16,
          duration: 3 + (i % 3),
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: i * 0.2,
        })
      })
    }, root)

    return () => ctx.revert()
  }, [])

  return (
    <section
      ref={root}
      id="hero"
      className="relative overflow-hidden bg-cream pt-24 md:pt-28"
    >
      <div
        className="graph-paper pointer-events-none absolute inset-0 opacity-50"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 80% at 70% 10%, transparent 40%, var(--color-cream) 100%)',
        }}
        aria-hidden="true"
      />

      {floatSymbols.map((s, i) => (
        <span
          key={i}
          className={`float-sym pointer-events-none absolute hidden font-mono font-bold md:block ${s.size} ${s.color}`}
          style={{ top: s.top, bottom: s.bottom, left: s.left, right: s.right }}
          aria-hidden="true"
        >
          {s.char}
        </span>
      ))}

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-end gap-8 px-5 md:grid-cols-12 md:px-8">
        {/* Text column */}
        <div className="order-2 pb-10 md:order-1 md:col-span-6 md:pb-20">
          <span className="hero-stagger inline-flex items-center gap-2 rounded-full border border-navy/15 bg-cream px-4 py-1.5 text-sm font-semibold text-navy-soft">
            <span className="size-2 rounded-full bg-emerald-brand" />
            منصة الرياضيات الأولى للثانوية العامة
          </span>

          <h1 className="mt-6 text-balance text-4xl font-extrabold leading-[1.15] text-navy sm:text-5xl lg:text-6xl">
            الرياضيات مش
            <span className="relative mx-2 inline-block text-emerald-deep">
              صعبة
              <FunctionCurve
                d="M5 30 Q 60 -5, 120 18 T 235 14"
                viewBox="0 0 240 40"
                className="absolute -bottom-3 right-0 h-4 w-full"
                stroke="var(--color-gold)"
                strokeWidth={3}
                delay={1.1}
              />
            </span>
            <br />
            هي بس محتاجة مُعلّم صح.
          </h1>

          <p className="hero-stagger mt-6 max-w-xl text-pretty text-lg leading-relaxed text-ink-muted">
            مع الأستاذ <span className="font-bold text-navy">عبد السلام</span> هتفهم كل
            فكرة من جذورها، وتتدرّب لحد ما المسألة تبقى أسهل حاجة. اختار مرحلتك وابدأ
            رحلتك للتفوق.
          </p>

          <div className="hero-stagger mt-9 flex flex-col gap-3 sm:flex-row">
            <a
              href="#stages"
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-gold px-8 py-4 text-base font-bold text-navy-deep shadow-lg shadow-gold/30 transition-transform duration-200 hover:-translate-y-0.5"
            >
              اختار مرحلتك الدراسية
              <ArrowLeft className="size-5 transition-transform duration-200 group-hover:-translate-x-1" />
            </a>
            <a
              href="#features"
              className="inline-flex items-center justify-center rounded-full border border-navy/20 px-8 py-4 text-base font-bold text-navy transition-colors hover:bg-navy/5"
            >
              اعرف أكتر عن المنصة
            </a>
          </div>

          <dl className="hero-stagger mt-12 grid max-w-md grid-cols-3 gap-6 border-t border-navy/10 pt-6">
            {[
              { v: '+25', l: 'سنة خبرة' },
              { v: '+48k', l: 'طالب' },
              { v: '%98', l: 'نسبة رضا' },
            ].map((s) => (
              <div key={s.l}>
                <dt className="font-mono text-2xl font-extrabold text-navy">{s.v}</dt>
                <dd className="mt-1 text-sm text-ink-muted">{s.l}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Photo column */}
        <div className="relative order-1 md:order-2 md:col-span-6">
          <span
            className="hero-name pointer-events-none absolute -top-2 right-1/2 z-0 translate-x-1/2 select-none whitespace-nowrap text-[5.5rem] font-black leading-none text-navy/[0.06] sm:text-[8rem] md:right-0 md:translate-x-0 md:text-[7rem] lg:text-[9rem]"
            aria-hidden="true"
          >
            عبد السلام
          </span>

          <FunctionCurve
            d="M40 360 C 120 380, 60 120, 200 140 S 320 60, 360 30"
            viewBox="0 0 400 400"
            className="pointer-events-none absolute inset-0 z-0 h-full w-full"
            stroke="var(--color-emerald-brand)"
            strokeWidth={3}
            delay={0.6}
          />

          <div className="hero-photo relative z-10 mx-auto max-w-md md:max-w-none">
            <Image
              src="/teacher-abdelsalam.png"
              alt="الأستاذ عبد السلام، مدرس الرياضيات"
              width={1196}
              height={1600}
              priority
              className="relative z-10 mx-auto h-auto w-full max-w-[420px] object-contain drop-shadow-2xl md:max-w-[520px]"
            />
            <div
              className="absolute bottom-6 right-1/2 z-0 h-px w-[120%] translate-x-1/2 bg-navy/15 md:bottom-10"
              aria-hidden="true"
            />
          </div>
        </div>
      </div>

      <EquationMarquee />
    </section>
  )
}

function EquationMarquee() {
  const items = [
    'f(x) = ax² + bx + c',
    'sin²θ + cos²θ = 1',
    'd/dx [xⁿ] = n·xⁿ⁻¹',
    '∫ₐᵇ f(x) dx',
    'e^{iπ} + 1 = 0',
    'a² + b² = c²',
    'Δ = b² − 4ac',
  ]
  return (
    <div className="relative z-10 mt-2 overflow-hidden border-y border-navy/10 bg-navy py-4">
      <div className="animate-marquee flex w-max items-center gap-12 whitespace-nowrap">
        {[0, 1].map((dup) => (
          <div key={dup} className="flex items-center gap-12" aria-hidden={dup === 1}>
            {items.map((eq, i) => (
              <span
                key={`${dup}-${i}`}
                className="flex items-center gap-12 font-mono text-base text-cream/70 md:text-lg"
              >
                {eq}
                <span className="text-gold">•</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

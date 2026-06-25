'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import gsap from 'gsap'
import { ArrowLeft, Sparkles } from 'lucide-react'

// Floating math objects scattered across the hero for an energetic, on-theme
// backdrop. Each carries a light-mode color and a dark-mode (neon) color.
const floatSymbols = [
  { char: '√', top: '30%', left: '4%', size: 'text-4xl', color: 'text-gold-deep/55', dark: 'dark:text-teal-glow/60' },
  { char: 'Σ', bottom: '24%', left: '7%', size: 'text-5xl', color: 'text-navy/15', dark: 'dark:text-violet-glow/55' },
  { char: '∞', top: '16%', left: '20%', size: 'text-3xl', color: 'text-emerald-brand/55', dark: 'dark:text-teal-glow/55' },
  { char: 'π', top: '10%', left: '38%', size: 'text-4xl', color: 'text-gold/55', dark: 'dark:text-violet-glow/60' },
  { char: '∫', top: '46%', left: '2%', size: 'text-5xl', color: 'text-emerald-deep/40', dark: 'dark:text-teal-deep/55' },
  { char: '∂', bottom: '34%', left: '30%', size: 'text-3xl', color: 'text-gold-deep/45', dark: 'dark:text-violet-glow/50' },
  { char: 'θ', top: '62%', left: '13%', size: 'text-4xl', color: 'text-navy/15', dark: 'dark:text-teal-glow/45' },
  { char: '%', top: '6%', left: '8%', size: 'text-3xl', color: 'text-emerald-brand/45', dark: 'dark:text-teal-glow/50' },
  { char: 'a+b', bottom: '8%', right: '4%', size: 'text-3xl', color: 'text-navy/12', dark: 'dark:text-violet-glow/45' },
  { char: 'x²', top: '8%', left: '52%', size: 'text-4xl', color: 'text-gold/45', dark: 'dark:text-violet-glow/55' },
]

export function HeroSection() {
  const root = useRef<HTMLElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (reduce) {
        gsap.set(['.hero-stagger', '.hero-axis'], { opacity: 1, y: 0, scaleX: 1 })
        gsap.set('.hero-photo', { opacity: 1 })
        return
      }

      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
      tl.from('.hero-stagger', { opacity: 0, y: 28, duration: 0.7, stagger: 0.1 })
        .from('.hero-photo', { opacity: 0, y: 40, scale: 0.97, duration: 1, clearProps: 'transform' }, '-=0.7')
        .from('.hero-axis', { opacity: 0, scaleX: 0, duration: 0.9, ease: 'power2.inOut' }, '-=0.8')

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

      gsap.utils.toArray<HTMLElement>('.float-obj').forEach((el, i) => {
        gsap.to(el, {
          y: i % 2 === 0 ? 20 : -20,
          rotate: i % 2 === 0 ? 8 : -8,
          duration: 5 + i,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: i * 0.35,
        })
      })
    }, root)

    return () => ctx.revert()
  }, [])

  return (
    <section ref={root} id="hero" className="relative overflow-hidden pt-28 md:pt-36">
      {floatSymbols.map((s, i) => (
        <span
          key={i}
          className={`float-sym pointer-events-none absolute hidden font-mono font-bold md:block ${s.size} ${s.color} ${s.dark}`}
          style={{ top: s.top, bottom: s.bottom, left: s.left, right: s.right }}
          aria-hidden="true"
        >
          {s.char}
        </span>
      ))}

      {/* Dark-mode-only wireframe 3D objects (cube + triangle) */}
      <WireCube className="float-obj left-[44%] top-[20%] hidden text-violet-glow/70 dark:block" />
      <WireTriangle className="float-obj bottom-[18%] left-[40%] hidden text-teal-glow/70 dark:block" />

      {/* Dark-mode-only code snippet, echoing the "math is just logic" idea */}
      <pre
        className="float-obj pointer-events-none absolute left-[2%] top-[26%] hidden font-mono text-[11px] leading-relaxed opacity-80 dark:lg:block"
        aria-hidden="true"
      >
        <code>
          <span className="text-teal-glow">for</span>{' '}
          <span className="text-ink-dim">i</span>{' '}
          <span className="text-teal-glow">in</span>{' '}
          <span className="text-ink-dim">range(n):</span>
          {'\n'}
          {'  '}
          <span className="text-violet-glow">if</span>{' '}
          <span className="text-ink-dim">arr[i] {'>'} target:</span>
          {'\n'}
          {'    '}
          <span className="text-teal-glow">return True</span>
          {'\n'}
          {'  '}
          <span className="text-violet-glow">else</span>
          <span className="text-ink-dim">:</span>
          {'\n'}
          {'    '}
          <span className="text-teal-glow">return False</span>
          {'\n'}
          <span className="text-ink-dim">print(</span>
          <span className="text-violet-glow">&quot;Keep Learning&quot;</span>
          <span className="text-ink-dim">)</span>
        </code>
      </pre>

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-end gap-6 px-5 md:grid-cols-12 md:gap-8 md:px-8">
        {/* Text column */}
        <div className="order-2 pb-16 md:order-1 md:col-span-6 md:pb-24">
          <span className="hero-stagger inline-flex items-center gap-2 rounded-full border border-navy/15 bg-cream/80 px-4 py-1.5 text-sm font-semibold text-navy-soft backdrop-blur dark:border-white/10 dark:bg-ink-raised/70 dark:text-teal-glow">
            <Sparkles className="size-4 text-gold-deep dark:text-teal-glow" />
            منصة الرياضيات الأولى للثانوية العامة
          </span>

          <h1 className="hero-stagger mt-7 font-hero text-4xl font-normal leading-[1.7] text-navy sm:text-5xl md:text-3xl md:leading-[1.6] lg:text-[2.5rem] lg:leading-[1.6] xl:text-[3.5rem] xl:leading-[1.65] dark:text-ink-fg">
            <span className="block">الرياضيات مش صعبة،</span>
            <span className="block">
              هي بس محتاجة{' '}
              <span className="text-emerald-deep dark:text-teal-glow">مُعلّم</span>{' '}
              <span className="relative whitespace-nowrap text-emerald-deep dark:text-teal-glow">
                صح
                <span
                  className="absolute -bottom-1 right-0 h-[0.3em] w-full rounded-full bg-gold/70 dark:bg-teal-glow/70"
                  aria-hidden="true"
                />
              </span>
            </span>
          </h1>

          <p className="hero-stagger mt-6 max-w-xl text-pretty text-lg leading-relaxed text-ink-muted md:text-sm lg:text-base xl:text-lg dark:text-ink-dim">
            مع الأستاذ <span className="font-bold text-navy dark:text-ink-fg">عبد السلام</span> هتفهم كل
            فكرة من جذورها، وتتدرّب لحد ما المسألة تبقى أسهل حاجة. اختار مرحلتك وابدأ
            رحلتك للتفوق.
          </p>

          <div className="hero-stagger mt-9 flex flex-col gap-3 sm:flex-row">
            <a
              href="#stages"
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-gold px-8 py-4 text-base font-bold text-navy-deep shadow-lg shadow-gold/30 transition-transform duration-200 hover:-translate-y-0.5 dark:bg-violet-glow dark:text-white dark:shadow-[0_0_30px_oklch(0.66_0.2_292_/_0.45)]"
            >
              اختار مرحلتك الدراسية
              <ArrowLeft className="size-5 transition-transform duration-200 group-hover:-translate-x-1" />
            </a>
            <a
              href="#features"
              className="inline-flex items-center justify-center rounded-full border border-navy/20 bg-cream/60 px-8 py-4 text-base font-bold text-navy backdrop-blur transition-colors hover:bg-navy/5 dark:border-white/15 dark:bg-white/5 dark:text-ink-fg dark:hover:bg-white/10"
            >
              اعرف أكتر عن المنصة
            </a>
          </div>

          <dl className="hero-stagger mt-12 grid max-w-md grid-cols-3 gap-6 border-t border-navy/10 pt-6 dark:border-white/10">
            {[
              { v: '+25', l: 'سنة خبرة' },
              { v: '+48k', l: 'طالب' },
              { v: '%98', l: 'نسبة رضا' },
            ].map((s) => (
              <div key={s.l}>
                <dt className="font-mono text-2xl font-extrabold text-navy dark:text-teal-glow">{s.v}</dt>
                <dd className="mt-1 text-sm text-ink-muted dark:text-ink-dim">{s.l}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Photo column */}
        <div className="relative order-1 flex items-end justify-center self-end md:order-2 md:col-span-6">
          {/* soft grounding glow under the figure */}
          <div
            className="pointer-events-none absolute bottom-2 left-1/2 h-24 w-[78%] -translate-x-1/2 rounded-[50%] bg-navy/15 blur-2xl dark:bg-teal-glow/25"
            aria-hidden="true"
          />
          {/* dark-mode radial halo behind the teacher */}
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 hidden h-[120%] w-[120%] -translate-x-1/2 -translate-y-1/2 rounded-full dark:block"
            aria-hidden="true"
            style={{
              background:
                'radial-gradient(closest-side, oklch(0.84 0.13 184 / 0.18), transparent 70%)',
            }}
          />
          {/* negative margin-top raises the image above the section baseline while
              staying clipped by overflow-hidden on the section — never bleeds into navbar */}
          <div className="hero-photo relative z-10 w-full max-w-[420px] md:-mt-16 md:max-w-[520px] lg:-mt-24 xl:-mt-12">
            {/* light-mode portrait */}
            <Image
              src="/teacher-abdelsalam.webp"
              alt="الأستاذ عبد السلام، مدرس الرياضيات"
              width={1083}
              height={1452}
              priority
              className="h-auto w-full object-contain dark:hidden"
            />
            {/* dark-mode portrait (neon calligraphy artwork) */}
            <Image
              src="/teacher-abdelsalam-dark.webp"
              alt="الأستاذ عبد السلام، مدرس الرياضيات"
              width={772}
              height={1024}
              priority
              className="hidden h-auto w-full object-contain dark:block"
            />
          </div>
        </div>
      </div>

      {/* Creative bridge: a gold "x-axis" the teacher stands on, flowing into the next section */}
      <div className="relative">
        <div
          className="hero-axis mx-auto h-px w-full max-w-7xl origin-center bg-gradient-to-l from-transparent via-gold to-transparent dark:via-teal-glow"
          aria-hidden="true"
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 mx-auto flex max-w-7xl justify-between px-8">
          {Array.from({ length: 13 }).map((_, i) => (
            <span key={i} className="h-2 w-px bg-gold/40 dark:bg-teal-glow/40" aria-hidden="true" />
          ))}
        </div>
      </div>
    </section>
  )
}

function WireCube({ className = '' }: { className?: string }) {
  return (
    <svg
      width="92"
      height="92"
      viewBox="0 0 100 100"
      fill="none"
      className={`pointer-events-none absolute ${className}`}
      aria-hidden="true"
    >
      <g stroke="currentColor" strokeWidth="1.5" opacity="0.9">
        <path d="M20 30 L60 18 L80 34 L40 46 Z" />
        <path d="M20 30 L20 66 L40 82 L40 46" />
        <path d="M40 46 L80 34 L80 70 L40 82" />
        <path d="M20 66 L60 54 L80 70" opacity="0.45" />
        <path d="M60 18 L60 54" opacity="0.45" />
      </g>
    </svg>
  )
}

function WireTriangle({ className = '' }: { className?: string }) {
  return (
    <svg
      width="84"
      height="84"
      viewBox="0 0 100 100"
      fill="none"
      className={`pointer-events-none absolute ${className}`}
      aria-hidden="true"
    >
      <g stroke="currentColor" strokeWidth="1.5" opacity="0.9">
        <path d="M50 16 L86 80 L14 80 Z" />
        <path d="M50 16 L50 80" opacity="0.4" />
        <path d="M32 48 L68 48" opacity="0.4" />
      </g>
    </svg>
  )
}

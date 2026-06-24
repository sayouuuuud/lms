'use client'

import { useRef } from 'react'
import Image from 'next/image'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { Sparkles, ArrowLeft, PlayCircle } from 'lucide-react'

const floatingSymbols = [
  { s: 'π', cls: 'top-[8%] right-[6%] text-5xl text-emerald-brand', dur: 4 },
  { s: 'x²', cls: 'top-[14%] left-[8%] text-4xl text-gold-deep', dur: 5 },
  { s: '√', cls: 'top-[42%] right-[2%] text-5xl text-gold', dur: 4.5 },
  { s: 'Σ', cls: 'bottom-[26%] left-[4%] text-5xl text-emerald-deep', dur: 5.5 },
  { s: '∫', cls: 'bottom-[10%] right-[12%] text-5xl text-gold-deep', dur: 4.2 },
  { s: '∞', cls: 'top-[60%] left-[14%] text-4xl text-navy/40', dur: 6 },
  { s: 'Δ', cls: 'bottom-[40%] right-[20%] text-3xl text-emerald-brand', dur: 5 },
  { s: '÷', cls: 'top-[30%] left-[2%] text-3xl text-gold', dur: 4.8 },
]

export function HeroSection() {
  const root = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
      tl.from('.hero-badge', { y: 20, opacity: 0, duration: 0.6 })
        .from(
          '.hero-line',
          { y: 40, opacity: 0, duration: 0.7, stagger: 0.12 },
          '-=0.2',
        )
        .from('.hero-sub', { y: 24, opacity: 0, duration: 0.6 }, '-=0.3')
        .from(
          '.hero-cta',
          { y: 24, opacity: 0, duration: 0.5, stagger: 0.1 },
          '-=0.3',
        )
        .from(
          '.hero-stat',
          { y: 20, opacity: 0, duration: 0.5, stagger: 0.1 },
          '-=0.2',
        )
        .from(
          '.hero-image',
          { scale: 0.9, opacity: 0, duration: 0.9, ease: 'power2.out' },
          '-=1',
        )
        .from(
          '.hero-glow',
          { scale: 0.6, opacity: 0, duration: 1 },
          '-=1',
        )

      // floating symbols entrance + loop
      gsap.utils.toArray<HTMLElement>('.float-sym').forEach((el, i) => {
        gsap.fromTo(
          el,
          { opacity: 0, scale: 0 },
          { opacity: 1, scale: 1, duration: 0.6, delay: 0.8 + i * 0.08 },
        )
        gsap.to(el, {
          y: () => gsap.utils.random(-22, 22),
          x: () => gsap.utils.random(-12, 12),
          rotation: () => gsap.utils.random(-12, 12),
          duration: () => gsap.utils.random(3, 6),
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: 1,
        })
      })

      // pointer parallax on the portrait
      const onMove = (e: MouseEvent) => {
        const rx = (e.clientX / window.innerWidth - 0.5) * 16
        const ry = (e.clientY / window.innerHeight - 0.5) * 16
        gsap.to('.hero-image', { x: rx, y: ry, duration: 0.8 })
        gsap.to('.float-sym', { x: -rx * 0.6, duration: 0.8 })
      }
      window.addEventListener('mousemove', onMove)
      return () => window.removeEventListener('mousemove', onMove)
    },
    { scope: root },
  )

  return (
    <section
      ref={root}
      id="hero"
      className="relative overflow-hidden bg-cream pt-28 pb-16 md:pt-32 md:pb-24"
    >
      {/* faint formula backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 select-none font-mono text-cream-deep"
      >
        <span className="absolute left-[6%] top-[20%] text-7xl">f(x)=x²</span>
        <span className="absolute right-[10%] top-[55%] text-6xl">∮ dx</span>
        <span className="absolute left-[20%] bottom-[8%] text-7xl">a²+b²=c²</span>
        <span className="absolute right-[30%] top-[12%] text-5xl">lim→∞</span>
      </div>

      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 md:px-8 lg:grid-cols-2">
        {/* Text */}
        <div className="text-center lg:text-right">
          <span className="hero-badge inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-4 py-1.5 text-sm font-bold text-gold-deep">
            <Sparkles className="size-4" />
            منصة الأستاذ عبد السلام للرياضيات
          </span>

          <h1 className="mt-6 text-balance text-4xl font-extrabold leading-tight text-navy md:text-6xl">
            <span className="hero-line block">الرياضيات أسهل</span>
            <span className="hero-line block">
              مع <span className="text-emerald-brand">مستر عبد السلام</span>
            </span>
            <span className="hero-line block text-gold-deep">خطوة بخطوة للتفوق</span>
          </h1>

          <p className="hero-sub mx-auto mt-6 max-w-xl text-pretty text-lg leading-relaxed text-navy/70 lg:mx-0">
            شرح مبسّط، بنك أسئلة ضخم، وامتحانات تفاعلية تخلّيك تتقن كل درس. اختار
            مرحلتك الدراسية وابدأ رحلة التفوق في الرياضيات من النهاردة.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
            <a
              href="#stages"
              className="hero-cta inline-flex items-center gap-2 rounded-full bg-gradient-to-l from-gold-deep to-gold px-7 py-3.5 text-base font-bold text-navy shadow-xl shadow-gold/30 transition-transform hover:-translate-y-0.5"
            >
              اختر مرحلتك الدراسية
              <ArrowLeft className="size-5" />
            </a>
            <a
              href="#features"
              className="hero-cta inline-flex items-center gap-2 rounded-full border-2 border-navy/15 bg-cream px-6 py-3.5 text-base font-bold text-navy transition-colors hover:border-navy/30"
            >
              <PlayCircle className="size-5 text-emerald-brand" />
              تعرّف علينا
            </a>
          </div>

          <div className="mt-10 flex items-center justify-center gap-8 lg:justify-start">
            {[
              { n: '+48 ألف', l: 'طالب' },
              { n: '+25 سنة', l: 'خبرة' },
              { n: '%98', l: 'رضا الطلاب' },
            ].map((s) => (
              <div key={s.l} className="hero-stat text-center lg:text-right">
                <div className="text-2xl font-extrabold text-emerald-deep md:text-3xl">
                  {s.n}
                </div>
                <div className="text-sm font-medium text-navy/60">{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Portrait + floating math */}
        <div className="relative mx-auto w-full max-w-md lg:max-w-none">
          <div className="relative aspect-[3/4]">
            {/* glow */}
            <div className="hero-glow absolute inset-x-6 bottom-6 top-10 rounded-[40%] bg-emerald-brand/20 blur-3xl" />
            <div className="hero-glow absolute inset-x-10 bottom-0 top-20 rounded-[45%] bg-gold/20 blur-3xl" />

            <Image
              src="/teacher-abdelsalam.png"
              alt="الأستاذ عبد السلام مدرس الرياضيات"
              fill
              priority
              sizes="(max-width: 1024px) 90vw, 600px"
              className="hero-image relative z-10 object-contain drop-shadow-2xl"
            />

            {floatingSymbols.map((sym, i) => (
              <span
                key={i}
                className={`float-sym pointer-events-none absolute z-20 font-extrabold font-mono ${sym.cls}`}
              >
                {sym.s}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

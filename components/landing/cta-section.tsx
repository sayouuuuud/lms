'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ArrowLeft } from 'lucide-react'

gsap.registerPlugin(ScrollTrigger)

export function CtaSection() {
  const root = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      gsap.from('.cta-inner', {
        scrollTrigger: { trigger: root.current, start: 'top 85%' },
        y: 40,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
      })
      gsap.utils.toArray<HTMLElement>('.cta-sym').forEach((el) => {
        gsap.to(el, {
          y: () => gsap.utils.random(-18, 18),
          rotation: () => gsap.utils.random(-15, 15),
          duration: () => gsap.utils.random(3, 5),
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        })
      })
    },
    { scope: root },
  )

  return (
    <section ref={root} className="bg-cream pb-24 pt-4">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="cta-inner relative overflow-hidden rounded-[2.5rem] bg-gradient-to-l from-emerald-deep to-emerald-brand px-6 py-16 text-center shadow-2xl shadow-emerald-brand/20 md:px-16 md:py-20">
          {/* floating math */}
          {['π', '√', 'Σ', '∞', 'x²'].map((s, i) => (
            <span
              key={i}
              className="cta-sym pointer-events-none absolute font-mono text-5xl font-extrabold text-white/15"
              style={{
                top: `${[12, 65, 25, 70, 40][i]}%`,
                left: `${[8, 14, 85, 80, 50][i]}%`,
              }}
            >
              {s}
            </span>
          ))}

          <h2 className="relative text-balance text-3xl font-extrabold text-cream md:text-5xl">
            جاهز تبدأ رحلة التفوق في الرياضيات؟
          </h2>
          <p className="relative mx-auto mt-4 max-w-xl text-pretty text-lg leading-relaxed text-cream/85">
            انضم لآلاف الطلاب اللي حقّقوا أعلى الدرجات مع مستر عبد السلام. سجّل
            دلوقتي وابدأ أول حصة مجانًا.
          </p>
          <div className="relative mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/student"
              className="inline-flex items-center gap-2 rounded-full bg-gold px-8 py-4 text-base font-bold text-navy shadow-xl shadow-black/10 transition-transform hover:-translate-y-0.5"
            >
              سجّل الآن مجانًا
              <ArrowLeft className="size-5" />
            </Link>
            <a
              href="#stages"
              className="inline-flex items-center gap-2 rounded-full border-2 border-cream/40 px-7 py-4 text-base font-bold text-cream transition-colors hover:bg-white/10"
            >
              تصفّح المراحل
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

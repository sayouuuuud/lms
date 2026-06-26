'use client'

import { useRef } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'

// The matter-js physics canvas is heavy; load it client-side only so it never
// blocks first paint of the landing page.
const GravityPills = dynamic(
  () => import('./gravity-pills').then((m) => m.GravityPills),
  { ssr: false },
)

gsap.registerPlugin(ScrollTrigger)

const perks = ['أول حصة مجانًا', 'إلغاء في أي وقت', 'متابعة مع ولي الأمر']

export function CtaSection() {
  const root = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      gsap.from('.cta-content', {
        scrollTrigger: { trigger: root.current, start: 'top 85%' },
        y: 40,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
      })
    },
    { scope: root },
  )

  return (
    <section
      ref={root}
      // pb-0 so the physics floor lines up with the footer's roof
      className="relative min-h-[860px] overflow-hidden pt-20 md:min-h-[820px]"
    >
      {/* physics-driven math pills fall and pile up on the footer's roof */}
      <GravityPills />

      {/* CTA copy sits at the top; only interactive bits catch clicks */}
      <div className="cta-content pointer-events-none relative z-10 mx-auto max-w-2xl px-5 text-center md:px-8">
        <span className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-gold-deep/30 bg-gold/15 px-4 py-1.5 text-sm font-semibold text-gold-deep dark:border-teal-deep/40 dark:bg-teal-glow/10 dark:text-teal-glow">
          ابدأ النهاردة
        </span>

        <h2 className="mt-5 text-balance text-3xl font-thmanyah font-bold leading-tight text-navy md:text-5xl dark:text-ink-fg">
          جاهز تبدأ رحلة التفوق في الرياضيات؟
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-pretty text-lg leading-relaxed text-ink-muted dark:text-ink-dim">
          انضم لآلاف الطلاب اللي حقّقوا أعلى الدرجات مع مستر عبد السلام. سجّل
          دلوقتي وابدأ أول حصة مجانًا.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/student"
            className="group pointer-events-auto inline-flex items-center gap-2 rounded-full bg-navy px-8 py-4 text-base font-bold text-cream shadow-xl shadow-navy/20 transition-transform hover:-translate-y-0.5 dark:bg-violet-glow dark:text-white dark:shadow-[0_0_28px_oklch(0.66_0.2_292_/_0.45)]"
          >
            سجّل الآن مجانًا
            <ArrowLeft className="size-5 transition-transform group-hover:-translate-x-1" />
          </Link>
          <a
            href="#stages"
            className="pointer-events-auto inline-flex items-center gap-2 rounded-full border-2 border-navy/20 bg-cream/60 px-7 py-4 text-base font-bold text-navy backdrop-blur-sm transition-colors hover:bg-cream dark:border-white/15 dark:bg-white/5 dark:text-ink-fg dark:hover:bg-white/10"
          >
            تصفّح المراحل
          </a>
        </div>

        <ul className="mx-auto mt-9 flex max-w-xl flex-wrap items-center justify-center gap-x-7 gap-y-2 text-sm text-ink-muted dark:text-ink-dim">
          {perks.map((p) => (
            <li key={p} className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-brand dark:text-teal-glow" />
              {p}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

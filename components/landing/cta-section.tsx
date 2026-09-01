'use client'

import { useRef } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import type { CtaContent } from '@/lib/site-content-defaults'
import { DEFAULT_SITE_CONTENT } from '@/lib/site-content-defaults'

// The matter-js physics canvas is heavy; load it client-side only so it never
// blocks first paint of the landing page.
const GravityPills = dynamic(
  () => import('./gravity-pills').then((m) => m.GravityPills),
  { ssr: false },
)

gsap.registerPlugin(ScrollTrigger)

export function CtaSection({ content = DEFAULT_SITE_CONTENT.cta }: { content?: CtaContent }) {
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
      className="relative min-h-[860px] overflow-hidden pt-20 md:min-h-[820px] bg-navy dark:bg-[#070d1a] dark:border-y dark:border-white/5"
    >
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

      {/* Benzene ring wireframe decoration (top-left) */}
      <svg className="pointer-events-none absolute left-2 top-8 text-white/8 dark:text-purple-glow/20" width="80" height="80" viewBox="0 0 100 100" fill="none" aria-hidden="true">
        <polygon points="50,12 85,32 85,68 50,88 15,68 15,32" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="50" cy="50" r="20" stroke="currentColor" strokeWidth="1.2" strokeDasharray="5 3" />
        <line x1="50" y1="12" x2="50" y2="4" stroke="currentColor" strokeWidth="1" opacity="0.6" />
        <line x1="85" y1="32" x2="92" y2="28" stroke="currentColor" strokeWidth="1" opacity="0.6" />
        <line x1="85" y1="68" x2="92" y2="72" stroke="currentColor" strokeWidth="1" opacity="0.6" />
        <line x1="50" y1="88" x2="50" y2="96" stroke="currentColor" strokeWidth="1" opacity="0.6" />
        <line x1="15" y1="68" x2="8" y2="72" stroke="currentColor" strokeWidth="1" opacity="0.6" />
        <line x1="15" y1="32" x2="8" y2="28" stroke="currentColor" strokeWidth="1" opacity="0.6" />
      </svg>

      {/* Bohr Atom decoration (bottom-right) */}
      <svg className="pointer-events-none absolute right-4 bottom-4 text-white/8 dark:text-teal-glow/20" width="100" height="100" viewBox="0 0 100 100" fill="none" aria-hidden="true">
        <circle cx="50" cy="50" r="5" fill="currentColor" opacity="0.6" />
        <ellipse cx="50" cy="50" rx="40" ry="15" stroke="currentColor" strokeWidth="1.2" transform="rotate(0 50 50)" opacity="0.7" />
        <ellipse cx="50" cy="50" rx="40" ry="15" stroke="currentColor" strokeWidth="1.2" transform="rotate(60 50 50)" opacity="0.7" />
        <ellipse cx="50" cy="50" rx="40" ry="15" stroke="currentColor" strokeWidth="1.2" transform="rotate(120 50 50)" opacity="0.7" />
        <circle cx="90" cy="50" r="2.5" fill="currentColor" />
        <circle cx="30" cy="85" r="2.5" fill="currentColor" />
        <circle cx="30" cy="15" r="2.5" fill="currentColor" />
      </svg>

      {/* physics-driven chemistry pills fall and pile up on the footer's roof */}
      <GravityPills />

      {/* CTA copy sits at the top; only interactive bits catch clicks */}
      <div className="cta-content pointer-events-none relative z-10 mx-auto max-w-2xl px-5 text-center md:px-8">
        <span className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-4 py-1.5 text-sm font-semibold text-gold dark:border-teal-deep/40 dark:bg-teal-glow/10 dark:text-teal-glow">
          {content.badge}
        </span>

        <h2 className="mt-5 text-balance text-3xl font-thmanyah font-bold leading-tight text-cream md:text-5xl">
          {content.title}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-pretty text-lg leading-relaxed text-cream/70">
          {content.description}
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={content.cta1Href}
            className="group pointer-events-auto inline-flex items-center gap-2 rounded-full bg-gold px-8 py-4 text-base font-bold text-navy shadow-xl shadow-gold/25 transition-transform hover:-translate-y-0.5 hover:bg-gold-deep dark:bg-brand dark:text-[#0a0f1a] dark:shadow-[0_0_28px_rgba(218, 173, 76,0.45)]"
          >
            {content.cta1Text}
            <ArrowLeft className="size-5 transition-transform group-hover:-translate-x-1" />
          </Link>
          <a
            href={content.cta2Href}
            className="pointer-events-auto inline-flex items-center gap-2 rounded-full border-2 border-white/20 bg-white/10 px-7 py-4 text-base font-bold text-cream backdrop-blur-sm transition-colors hover:bg-white/20 dark:border-white/15 dark:bg-white/5 dark:text-cream dark:hover:bg-white/10"
          >
            {content.cta2Text}
          </a>
        </div>

        <ul className="mx-auto mt-9 flex max-w-xl flex-wrap items-center justify-center gap-x-7 gap-y-2 text-sm text-cream/70">
          {content.perks.map((p) => (
            <li key={p} className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-gold dark:text-brand" />
              {p}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}


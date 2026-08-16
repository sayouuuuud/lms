'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { useReveal } from '@/lib/use-reveal'

const GravityPills = dynamic(() => import('@/components/gravity-pills').then((m) => m.GravityPills), {
  ssr: false,
})

export function CtaSection({ content }: { content?: any }) {
  const contentRef = useReveal<HTMLDivElement>(undefined, { y: 40, duration: 0.8 })

  if (!content) return null

  return (
    <section
      id="cta"
      className="relative min-h-[680px] overflow-hidden bg-background pt-16 sm:min-h-[760px] sm:pt-20 md:min-h-[820px]"
    >
      <GravityPills />

      <div
        ref={contentRef}
        className="pointer-events-none relative z-10 mx-auto max-w-2xl px-4 text-center sm:px-5 md:px-8"
      >
        <span className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/15 px-4 py-1.5 text-sm font-semibold text-foreground">
          {content.badge}
        </span>

        <h2 
          className="mt-5 text-balance text-3xl font-black leading-tight text-foreground md:text-5xl"
          style={{ fontFamily: "'Thmanyah Sans', sans-serif" }}
        >
          {content.title}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
          {content.description}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:mt-9">
          <Link
            href={content.cta1Href}
            className="group pointer-events-auto inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-black text-primary-foreground shadow-xl shadow-primary/25 transition-transform hover:-translate-y-0.5 sm:px-8 sm:py-4 sm:text-base"
          >
            {content.cta1Text}
            <ArrowLeft className="size-5 transition-transform group-hover:-translate-x-1" />
          </Link>
          <a
            href={content.cta2Href}
            className="pointer-events-auto inline-flex items-center gap-2 rounded-full border-2 border-border bg-card/60 px-6 py-3.5 text-sm font-bold text-foreground backdrop-blur-sm transition-colors hover:bg-card sm:px-7 sm:py-4 sm:text-base"
          >
            {content.cta2Text}
          </a>
        </div>

        <ul className="mx-auto mt-9 flex max-w-xl flex-wrap items-center justify-center gap-x-7 gap-y-2 text-sm text-muted-foreground">
          {content.perks?.map((p: string) => (
            <li key={p} className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-green" />
              {p}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

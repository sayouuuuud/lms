'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import gsap from 'gsap'
import Image from 'next/image'
import { ArrowLeft, ChevronDown } from 'lucide-react'
import { type Stage } from '@/lib/landing-data'
import { cn } from '@/lib/utils'
import { useReveal } from '@/lib/use-reveal'

export function StagesSection({ stages = [] }: { stages?: Stage[] }) {
  const headRef = useReveal<HTMLDivElement>(undefined, { y: 30 })
  const [active, setActive] = useState(0)

  return (
    <section id="stages" className="relative overflow-hidden py-24 md:py-32">
      {/* Subtle ambient lighting for the section */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[650px] w-[92%] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-35 blur-3xl dark:opacity-20"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(218, 173, 76, 0.12), rgba(218, 173, 76, 0.09), transparent 70%)',
        }}
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-7xl px-5 md:px-8">

        {/* Desktop: heading + list on the right, card sticky on the left */}
        <div className="hidden items-start gap-10 lg:grid lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div ref={headRef}>
              <span className="text-sm font-semibold text-brand dark:text-brand">
                <span className="font-mono">{'// '}</span>
                اختار مرحلتك
              </span>
              <h2 className="font-thmanyah font-bold mt-3 text-balance text-3xl leading-tight text-navy sm:text-4xl lg:text-5xl dark:text-ink-fg">
                مرحلتك التعليمية
              </h2>
              <p className="mt-5 text-pretty text-lg leading-relaxed text-navy/70 dark:text-ink-dim">
                كل مرحلة فيها المواد مرتبة خطوة بخطوة. عدّي على السنة اللي انت فيها وشوف
                اللي مستنيك جواها.
              </p>
            </div>
            <ul className="mt-14 border-t border-navy/10 dark:border-white/10">
            {stages.map((stage, i) => (
              <li key={stage.id}>
                <Link
                  href={`/stages/${stage.id}`}
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  className="group grid grid-cols-[5rem_1fr_auto] items-center gap-4 border-b border-navy/10 dark:border-white/10 py-8 transition-colors"
                >
                  <span
                    className={cn(
                      'font-sans text-4xl font-bold transition-colors xl:text-6xl',
                      active === i ? 'text-brand dark:text-brand' : 'text-navy/20 dark:text-white/15',
                    )}
                  >
                    {stage.index}
                  </span>
                  <span>
                    <span
                      className={cn(
                        'block text-2xl font-bold font-sans transition-colors xl:text-3xl',
                        active === i ? 'text-navy dark:text-ink-fg' : 'text-navy dark:text-ink-fg/70',
                      )}
                    >
                      {stage.title}
                    </span>
                    <span className="mt-1 block text-sm text-navy dark:text-ink-fg/45">{stage.subtitle}</span>
                  </span>
                  <ArrowLeft
                    className={cn(
                      'size-7 transition-all',
                      active === i
                        ? '-translate-x-1 text-brand dark:text-brand'
                        : 'text-navy/30 dark:text-white/25 group-hover:text-navy/60 dark:text-white/50',
                    )}
                  />
                </Link>
              </li>
            ))}
          </ul>
          </div>

          {stages[active] && <StagePreview stage={stages[active]} />}
        </div>

        {/* Mobile heading — only shows below lg */}
        <div className="lg:hidden">
          <span className="text-sm font-semibold text-brand dark:text-brand">
            <span className="font-mono">{'// '}</span>
            اختار مرحلتك
          </span>
          <h2 className="font-thmanyah font-bold mt-3 text-balance text-3xl leading-tight text-navy sm:text-4xl dark:text-ink-fg">
            مرحلتك التعليمية
          </h2>
          <p className="mt-5 text-pretty text-lg leading-relaxed text-navy/70 dark:text-ink-dim">
            كل مرحلة فيها المواد مرتبة خطوة بخطوة. عدّي على السنة اللي انت فيها وشوف
            اللي مستنيك جواها.
          </p>
        </div>

        {/* Mobile: accordion */}
        <div className="mt-12 border-t border-navy/10 dark:border-white/10 lg:hidden">
          {stages.map((stage, i) => (
            <MobileStage
              key={stage.id}
              stage={stage}
              open={active === i}
              onToggle={() => setActive(active === i ? -1 : i)}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

function StagePreview({ stage }: { stage: Stage }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    gsap.fromTo(
      el,
      { opacity: 0, y: 16 },
      { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out' },
    )
  }, [stage.id])

  return (
    <div className="relative">
      <div className="sticky top-24">
        <div
          ref={ref}
          className="relative overflow-hidden rounded-3xl border border-navy/10 shadow-2xl shadow-navy/5 dark:border-white/10 bg-white dark:bg-[#0f172a]/80 p-8 backdrop-blur-sm"
        >
          {/* stage image — rectangular (16/9), rounded to match card corners */}
          <div className="relative aspect-video w-full overflow-hidden rounded-2xl">
            <Image
              src={stage.image}
              alt={stage.title}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 420px"
            />
          </div>

          <h3 className="relative mt-5 font-sans text-2xl font-bold text-navy dark:text-ink-fg">
            {stage.title}
          </h3>
          <p className="relative mt-2 leading-relaxed text-navy/70 dark:text-ink-dim">{stage.subtitle}</p>

          <div className="relative mt-7">
            <span className="font-sans text-xs font-bold uppercase tracking-wider text-navy/70 dark:text-ink-fg/60">
              الصفوف داخل المرحلة
            </span>
            <ul className="mt-3 space-y-2">
              {stage.branches.map((branch, idx) => (
                <li
                  key={branch.id}
                  className="flex items-center gap-3 rounded-xl border border-navy/10 dark:border-white/10 bg-navy/5 dark:bg-white/5 px-4 py-3 text-navy dark:text-ink-fg/90"
                >
                  <span className="font-sans font-bold text-sm text-brand dark:text-brand">
                    {(idx + 1).toLocaleString('ar-EG', { minimumIntegerDigits: 2 })}
                  </span>
                  <span className="font-sans font-medium text-sm sm:text-base">{branch.title}</span>
                </li>
              ))}
            </ul>
          </div>

          <Link
            href={`/stages/${stage.id}`}
            className="relative mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand px-7 py-4 text-base font-bold font-sans text-navy transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand dark:bg-brand dark:text-[#0a0f1a] dark:shadow-[0_0_24px_rgba(218, 173, 76,0.4)]"
          >
            ادخل المرحلة
            <ArrowLeft className="size-5" />
          </Link>
        </div>
      </div>
    </div>
  )
}

function MobileStage({
  stage,
  open,
  onToggle,
}: {
  stage: Stage
  open: boolean
  onToggle: () => void
}) {
  return (
    <div className="border-b border-navy/10 dark:border-white/10">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-4 py-5 text-right"
        aria-expanded={open}
      >
        <span
          className={cn(
            'font-sans text-3xl font-bold transition-colors',
            open ? 'text-brand dark:text-brand' : 'text-navy/20 dark:text-white/20',
          )}
        >
          {stage.index}
        </span>
        <span className="flex-1">
          <span className="block font-sans text-lg font-bold text-navy dark:text-ink-fg">{stage.title}</span>
          <span className="mt-0.5 block font-sans text-xs text-navy dark:text-ink-fg/45">{stage.subtitle}</span>
        </span>
        <ChevronDown
          className={cn(
            'size-5 text-navy dark:text-ink-fg/50 transition-transform duration-300',
            open && 'rotate-180',
          )}
        />
      </button>

      <div
        className={cn(
          'grid transition-all duration-300',
          open ? 'grid-rows-[1fr] pb-6' : 'grid-rows-[0fr]',
        )}
      >
        <div className="overflow-hidden">
          <p className="text-pretty font-sans leading-relaxed text-navy/70 dark:text-ink-dim">{stage.subtitle}</p>
          <ul className="mt-4 space-y-2">
            {stage.branches.map((branch, idx) => (
              <li
                key={branch.id}
                className="flex items-center gap-3 rounded-xl border border-navy/10 dark:border-white/10 bg-navy/5 dark:bg-white/5 px-4 py-3 text-sm text-navy dark:text-ink-fg/90"
              >
                <span className="font-sans font-bold text-brand dark:text-brand">
                  {(idx + 1).toLocaleString('ar-EG', { minimumIntegerDigits: 2 })}
                </span>
                <span className="font-sans font-medium">{branch.title}</span>
              </li>
            ))}
          </ul>
          <Link
            href={`/stages/${stage.id}`}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand px-7 py-3.5 text-base font-bold text-navy transition-all duration-200 hover:bg-brand dark:bg-brand dark:text-[#0a0f1a]"
          >
            ادخل المرحلة
            <ArrowLeft className="size-5" />
          </Link>
        </div>
      </div>
    </div>
  )
}

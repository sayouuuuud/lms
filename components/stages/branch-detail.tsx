'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowRight,
  PlayCircle,
  Sparkles,
  Lock,
  Play,
  Layers,
  X,
} from 'lucide-react'
import { countLessons, type Stage, type Branch, type Lecture } from '@/lib/landing-data'
import { Check } from 'lucide-react'
import { useCart } from '@/components/cart/cart-provider'

function formatEGP(value: number) {
  return new Intl.NumberFormat('ar-EG').format(value)
}

function LectureCard({ lecture, index }: { lecture: Lecture; index: number }) {
  const [open, setOpen] = useState(false)
  const { add, inCart } = useCart()
  const added = lecture.dbId ? inCart(lecture.dbId) : false

  function handleAdd() {
    if (lecture.dbId) add(lecture.dbId, lecture.title)
  }

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-[1.75rem] border border-navy/10 bg-white shadow-sm ring-1 ring-transparent transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-navy/10 hover:ring-emerald-brand/30 dark:border-ink-line dark:bg-ink-raised dark:hover:ring-teal-glow/40">
      {/* lecture image with price + number overlays */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-gradient-to-br from-cream to-navy/5 dark:from-ink-base dark:to-ink-raised">
        <Image
          src={`/lessons/${lecture.id}.png`}
          alt={lecture.title}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-contain p-6 transition-transform duration-500 group-hover:scale-105"
        />
        {/* number chip */}
        <span className="absolute right-4 top-4 grid size-10 place-items-center rounded-xl border border-navy/10 bg-white/90 font-mono text-sm font-bold text-navy backdrop-blur dark:border-ink-line dark:bg-ink-base/90 dark:text-ink-fg">
          {String(index + 1).padStart(2, '0')}
        </span>
        {/* badge */}
        {lecture.badge && (
          <span className="absolute left-4 top-4 rounded-full bg-gold px-3 py-1 text-xs font-bold text-navy shadow-lg dark:bg-violet-glow dark:text-white">
            {lecture.badge}
          </span>
        )}
        {/* price tag */}
        <span className="absolute bottom-4 left-4 inline-flex items-baseline gap-1.5 rounded-2xl bg-navy px-4 py-2 shadow-lg shadow-navy/30 dark:bg-ink-base">
          {lecture.oldPrice && (
            <span className="text-xs text-cream/50 line-through">
              {formatEGP(lecture.oldPrice)}
            </span>
          )}
          <span className="font-heading text-xl font-extrabold text-cream">
            {formatEGP(lecture.price)}
          </span>
          <span className="text-xs font-bold text-gold dark:text-teal-glow">ج.م</span>
        </span>
      </div>

      {/* body */}
      <div className="flex flex-1 flex-col p-6">
        <h3 className="font-heading text-xl font-bold text-navy dark:text-ink-fg">{lecture.title}</h3>
        <p className="mt-2 text-pretty text-sm leading-relaxed text-navy-soft dark:text-ink-dim">
          {lecture.description}
        </p>

        {/* lessons count + open modal trigger */}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-5 flex w-full items-center justify-between rounded-2xl border border-navy/10 bg-cream/60 px-4 py-3 text-sm font-bold text-navy transition-colors hover:bg-cream dark:border-ink-line dark:bg-ink-base/60 dark:text-ink-fg dark:hover:bg-ink-base"
        >
          <span className="inline-flex items-center gap-2">
            <Layers className="size-4 text-emerald-deep" />
            محتوى المحاضرة ({lecture.lessons.length} درس)
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-deep">
            عرض
            <ArrowRight className="size-3.5 -rotate-180" />
          </span>
        </button>

        {/* subscribe CTA pinned to bottom */}
        <button
          type="button"
          onClick={handleAdd}
          className={`mt-4 flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-bold transition-colors ${
            added
              ? 'bg-emerald-brand/15 text-emerald-deep dark:bg-teal-glow/15 dark:text-teal-glow'
              : 'bg-navy text-cream hover:bg-navy-deep dark:bg-violet-glow dark:text-white dark:hover:bg-violet-deep'
          }`}
        >
          {added ? (
            <>
              <Check className="size-4" />
              <span>{'في السلة'}</span>
            </>
          ) : (
            <>
              <span>{'أضف للسلة'}</span>
              <ArrowRight className="size-4 -rotate-180" />
            </>
          )}
        </button>
      </div>

      {/* lessons panel — overlays the card itself (not a centered modal) */}
      {open && (
        <div className="absolute inset-0 z-10 flex flex-col bg-white dark:bg-ink-raised">
          {/* panel header */}
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-navy/10 bg-cream/60 px-5 py-4 dark:border-ink-line dark:bg-ink-base/60">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-deep">
                <Layers className="size-3.5" />
                محتوى المحاضرة
              </span>
              <h3 className="mt-0.5 font-heading text-lg font-bold text-navy dark:text-ink-fg">{lecture.title}</h3>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="grid size-9 shrink-0 place-items-center rounded-full bg-white text-navy shadow-sm transition-colors hover:bg-navy hover:text-cream dark:bg-ink-base dark:text-ink-fg dark:hover:bg-violet-glow dark:hover:text-white"
              aria-label="إغلاق"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* lessons list (scrollable inside the card) */}
          <ul className="flex-1 space-y-1 overflow-y-auto p-3">
            {lecture.lessons.map((lesson, li) => (
              <li
                key={lesson.id}
                className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-cream/60 dark:hover:bg-ink-base/60"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`grid size-8 shrink-0 place-items-center rounded-lg ${
                      lesson.isFree
                        ? 'bg-emerald-brand/15 text-emerald-deep'
                        : 'bg-navy/5 text-navy-soft dark:bg-ink-base dark:text-ink-dim'
                    }`}
                  >
                    {lesson.isFree ? <Play className="size-3.5" /> : <Lock className="size-3.5" />}
                  </span>
                  <div>
                    <span className="block text-sm font-semibold text-navy dark:text-ink-fg">
                      {li + 1}. {lesson.title}
                    </span>
                    {lesson.isFree && (
                      <span className="text-xs font-bold text-emerald-deep">معاينة مجانية</span>
                    )}
                  </div>
                </div>
                <span className="shrink-0 font-mono text-xs text-navy-soft dark:text-ink-dim">
                  {lesson.duration}
                </span>
              </li>
            ))}
          </ul>

          {/* panel footer CTA */}
          <div className="shrink-0 border-t border-navy/10 p-3 dark:border-ink-line">
            <button
              type="button"
              onClick={handleAdd}
              className={`flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold transition-colors ${
                added
                  ? 'bg-emerald-brand/15 text-emerald-deep dark:bg-teal-glow/15 dark:text-teal-glow'
                  : 'bg-navy text-cream hover:bg-navy-deep dark:bg-violet-glow dark:text-white dark:hover:bg-violet-deep'
              }`}
            >
              {added ? (
                <>
                  <Check className="size-4" />
                  <span>{'في السلة'}</span>
                </>
              ) : (
                <>
                  <span>{`أضف للسلة بـ ${formatEGP(lecture.price)} ج.م`}</span>
                  <ArrowRight className="size-4 -rotate-180" />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </article>
  )
}

export function BranchDetail({ stage, branch }: { stage: Stage; branch: Branch }) {
  const totalLessons = countLessons(branch)

  return (
    <main className="min-h-screen bg-cream dark:bg-ink-base">
      {/* ── Header / hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-navy dark:bg-ink-raised">
        <div
          className="graph-paper-light pointer-events-none absolute inset-0 opacity-60"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -left-32 top-0 h-96 w-96 rounded-full bg-gold/10 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-7xl px-5 pb-16 pt-28 md:px-8 md:pb-24 md:pt-32">
          {/* breadcrumb */}
          <nav className="flex flex-wrap items-center gap-2 text-sm font-semibold text-cream/60">
            <Link href="/#stages" className="transition-colors hover:text-gold dark:hover:text-teal-glow">
              المراحل
            </Link>
            <ArrowRight className="size-3.5" />
            <Link href={`/stages/${stage.id}`} className="transition-colors hover:text-gold dark:hover:text-teal-glow">
              {stage.title}
            </Link>
            <ArrowRight className="size-3.5" />
            <span className="text-cream/90">{branch.title}</span>
          </nav>

          <div className="mt-8 grid items-center gap-12 lg:grid-cols-[1.3fr_0.7fr]">
            <div>
              <span                 className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-sm font-semibold text-gold backdrop-blur dark:text-teal-glow">
                <Sparkles className="size-4" />
                فرع من {stage.title}
              </span>
              <h1 className="mt-5 text-balance font-heading text-4xl font-extrabold leading-tight text-cream md:text-6xl">
                {branch.title}
              </h1>
              <p className="mt-4 max-w-2xl text-pretty text-lg leading-relaxed text-cream/70">
                {branch.description}
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <span className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-navy-deep/40 px-4 py-2.5 text-sm text-cream/90">
                  <Layers className="size-4 text-gold" />
                  {branch.lectures.length} محاضرة
                </span>
                <span className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-navy-deep/40 px-4 py-2.5 text-sm text-cream/90">
                  <PlayCircle className="size-4 text-emerald-brand" />
                  {totalLessons} درس
                </span>
              </div>
            </div>

            <div className="relative aspect-square w-full overflow-hidden rounded-[2rem] border border-white/10 shadow-2xl shadow-navy-deep/50 lg:aspect-[4/5]">
              <Image
                src={branch.image}
                alt={branch.title}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 420px"
                priority
              />
              <div
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy/60 to-transparent"
                aria-hidden="true"
              />
            </div>
          </div>
        </div>

        {/* curved bottom divider */}
        <div className="relative h-12 md:h-16">
          <div className="absolute inset-x-0 bottom-0 h-12 rounded-t-[2.5rem] bg-cream md:h-16 md:rounded-t-[3.5rem] dark:bg-ink-base" />
        </div>
      </section>

      {/* ── Lectures ──────────────────────────────────────────────────── */}
      <section className="relative mx-auto max-w-6xl px-5 py-12 md:px-8 md:py-16">
        <div className="flex flex-col items-center text-center">
          <span className="text-sm font-semibold text-gold-deep dark:text-teal-glow">
            <span className="font-mono">{'// '}</span>
            محاضرات الفرع
          </span>
          <h2 className="mt-3 text-balance font-heading text-3xl font-extrabold text-navy md:text-4xl dark:text-ink-fg">
            اشترك في المحاضرة اللي محتاجها
          </h2>
          <p className="mt-3 max-w-2xl text-pretty leading-relaxed text-navy-soft dark:text-ink-dim">
            كل محاضرة جواها دروس مشروحة بالفيديو، وتقدر تشوف المعاينة المجانية قبل الاشتراك.
          </p>
        </div>

        <div className="mt-12 grid gap-7 sm:grid-cols-2">
          {branch.lectures.map((lecture, i) => (
            <LectureCard key={lecture.id} lecture={lecture} index={i} />
          ))}
        </div>

        {/* back to stage */}
        <div className="mt-12 flex justify-center">
          <Link
            href={`/stages/${stage.id}`}
            className="inline-flex items-center gap-2 rounded-full border border-navy/15 px-6 py-3 text-sm font-bold text-navy transition-colors hover:bg-navy/5 dark:border-ink-line dark:text-ink-fg dark:hover:bg-ink-raised"
          >
            <ArrowRight className="size-4" />
            رجوع لفروع {stage.title}
          </Link>
        </div>
      </section>
    </main>
  )
}

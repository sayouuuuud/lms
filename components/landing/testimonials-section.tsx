'use client'

import { useState, useEffect } from 'react'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts'
import { ArrowLeft, ArrowRight, Quote, TrendingUp } from 'lucide-react'
import { testimonials } from '@/lib/landing-data'
import { useReveal } from '@/lib/use-reveal'
import { cn } from '@/lib/utils'

export function TestimonialsSection() {
  const root = useReveal<HTMLElement>('.reveal-item')
  const [active, setActive] = useState(0)
  const student = testimonials[active]
  const jump = student.after - student.before

  useEffect(() => {
    const handleScroll = () => {
      if (!root.current) return
      
      const rect = root.current.getBoundingClientRect()
      const scrollableDistance = rect.height - window.innerHeight
      if (scrollableDistance <= 0) return

      const scrolled = -rect.top

      if (scrolled >= 0 && scrolled <= scrollableDistance) {
        const progress = scrolled / scrollableDistance
        const newIndex = Math.min(
          testimonials.length - 1,
          Math.max(0, Math.floor(progress * testimonials.length))
        )
        if (newIndex !== active) {
          setActive(newIndex)
        }
      } else if (scrolled < 0 && active !== 0) {
        setActive(0)
      } else if (scrolled > scrollableDistance && active !== testimonials.length - 1) {
        setActive(testimonials.length - 1)
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [active, root])

  return (
    <section ref={root} id="testimonials" className="relative h-[300vh]">
      <div className="sticky top-20 flex min-h-[calc(100vh-5rem)] w-full flex-col justify-center pb-8 pt-4 md:pb-12">
        <div className="mx-auto w-full max-w-7xl px-5 md:px-8">
          {/* heading */}
          <div className="reveal-item mx-auto mb-6 max-w-4xl text-center md:mb-10">
            <span className="text-sm font-semibold text-emerald-deep dark:text-teal-glow">
              <span className="font-mono">{'// '}</span>
              قصص نجاح حقيقية
            </span>
            <h2 className="font-thmanyah font-bold mt-3 text-3xl leading-tight text-navy sm:text-4xl lg:text-5xl dark:text-ink-fg">
              كل طالب رحلة... وكل رحلة منحنى صاعد
            </h2>
            <p className="mt-4 text-pretty text-lg leading-relaxed text-ink-muted dark:text-ink-dim">
              مش مجرد كلام. دي درجات طلاب حقيقيين اتحسّنت شهر ورا شهر لحد الامتحان النهائي.
            </p>
          </div>

          {/* featured panel: curve + story */}
          <div className="reveal-item grid grid-cols-1 gap-px overflow-hidden rounded-[2rem] border border-navy/15 bg-navy/15 shadow-2xl shadow-navy/10 lg:grid-cols-5 dark:border-white/10 dark:bg-white/5 dark:shadow-black/40">
            {/* chart card (navy) */}
            <div className="relative bg-navy p-5 sm:p-6 lg:p-7 lg:col-span-3 dark:bg-ink-raised">
              <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold tracking-wider text-gold dark:text-teal-glow">
                    منحنى التقدّم
                  </p>
                  <p className="mt-1 text-lg font-bold text-cream dark:text-ink-fg">{student.subject}</p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-brand/15 px-3 py-1.5 text-emerald-300 dark:bg-teal-glow/15 dark:text-teal-glow">
                  <TrendingUp className="size-4" />
                  <span className="text-sm font-bold">
                    <span className="font-thmanyah text-xl font-bold">+{jump.toLocaleString('ar-EG')}</span> نقطة
                  </span>
                </div>
              </div>

              <div className="h-56 w-full min-w-0 sm:h-64 md:h-56 lg:h-64" dir="ltr">
                <ResponsiveContainer width="99%" height="100%">
                  <ComposedChart
                    key={active}
                    data={student.journey}
                    margin={{ top: 8, right: 8, bottom: 0, left: -18 }}
                  >
                    <defs>
                      <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#d4af37" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#d4af37" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(255,255,255,0.10)" vertical />
                    <XAxis
                      dataKey="month"
                      tick={{ fill: 'rgba(245,241,232,0.55)', fontSize: 11 }}
                      tickLine={false}
                      axisLine={{ stroke: 'rgba(255,255,255,0.15)' }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      domain={[0, 100]}
                      ticks={[0, 25, 50, 75, 100]}
                      tick={{ fill: 'rgba(245,241,232,0.45)', fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      width={36}
                    />
                    <ReferenceLine
                      y={50}
                      stroke="rgba(255,255,255,0.25)"
                      strokeDasharray="5 5"
                      label={{
                        value: 'حد النجاح',
                        position: 'insideTopLeft',
                        fill: 'rgba(245,241,232,0.5)',
                        fontSize: 10,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="score"
                      stroke="none"
                      fill="url(#scoreFill)"
                      isAnimationActive
                      animationDuration={1400}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#d4af37"
                      strokeWidth={3}
                      dot={{ r: 3, fill: '#0a1f44', stroke: '#d4af37', strokeWidth: 2 }}
                      activeDot={{ r: 6, fill: '#d4af37' }}
                      isAnimationActive
                      animationDuration={1600}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* before -> after result, written like a math statement */}
              <div className="mt-6 flex items-center justify-center gap-4 font-thmanyah">
                <div className="text-center">
                  <span className="block text-xs text-cream/50 dark:text-ink-dim">قبل</span>
                  <span className="text-2xl font-bold text-red-400 dark:text-red-400/90">{student.before.toLocaleString('ar-EG')}٪</span>
                </div>
                <ArrowRight className="size-5 text-cream/30 dark:text-ink-dim" />
                <div className="text-center">
                  <span className="block text-xs text-cream/50 dark:text-ink-dim">بعد</span>
                  <span className="text-3xl font-extrabold text-emerald-300 dark:text-teal-glow">
                    {student.after.toLocaleString('ar-EG')}٪
                  </span>
                </div>
              </div>
            </div>

            {/* story card (cream) */}
            <div className="flex flex-col bg-cream p-5 sm:p-6 lg:p-7 lg:col-span-2 dark:bg-ink-base">
              <Quote className="size-9 text-gold dark:text-teal-glow/40" />
              <blockquote className="mt-4 flex-1 text-pretty text-lg font-medium leading-relaxed text-navy sm:text-xl dark:text-ink-fg">
                {student.quote}
              </blockquote>

              <div className="mt-6 border-t border-navy/10 pt-5 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <span className="grid size-12 place-items-center rounded-full bg-navy font-bold text-cream dark:bg-teal-glow dark:text-ink-base">
                    {student.name.charAt(0)}
                  </span>
                  <div>
                    <p className="font-bold text-navy dark:text-ink-fg">{student.name}</p>
                    <p className="text-sm text-ink-muted dark:text-ink-dim">{student.grade}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}

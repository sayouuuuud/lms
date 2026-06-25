'use client'

import { useState } from 'react'
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
import { ArrowLeft, Quote, TrendingUp } from 'lucide-react'
import { testimonials } from '@/lib/landing-data'
import { useReveal } from '@/lib/use-reveal'
import { cn } from '@/lib/utils'

export function TestimonialsSection() {
  const root = useReveal<HTMLElement>('.reveal-item')
  const [active, setActive] = useState(0)
  const student = testimonials[active]
  const jump = student.after - student.before

  return (
    <section ref={root} id="testimonials" className="relative py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        {/* heading */}
        <div className="reveal-item mx-auto mb-12 max-w-2xl text-center md:mb-16">
          <span className="text-sm font-semibold text-emerald-deep">
            <span className="font-mono">{'// '}</span>
            قصص نجاح حقيقية
          </span>
          <h2 className="mt-3 text-balance text-3xl font-extrabold leading-tight text-navy sm:text-4xl lg:text-5xl">
            كل طالب رحلة... وكل رحلة منحنى صاعد
          </h2>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-ink-muted">
            مش مجرد كلام. دي درجات طلاب حقيقيين اتحسّنت شهر ورا شهر لحد الامتحان النهائي.
          </p>
        </div>

        {/* featured panel: curve + story */}
        <div className="reveal-item grid grid-cols-1 gap-px overflow-hidden rounded-[2rem] border border-navy/15 bg-navy/15 shadow-2xl shadow-navy/10 lg:grid-cols-5">
          {/* chart card (navy) */}
          <div className="relative bg-navy p-6 sm:p-8 lg:col-span-3">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold tracking-wider text-gold">
                  منحنى التقدّم
                </p>
                <p className="mt-1 text-lg font-bold text-cream">{student.subject}</p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-brand/15 px-3 py-1.5 text-emerald-300">
                <TrendingUp className="size-4" />
                <span className="text-sm font-bold">
                  <span className="font-mono">+{jump}</span> نقطة
                </span>
              </div>
            </div>

            <div className="h-64 w-full sm:h-72" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
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
            <div className="mt-6 flex items-center justify-center gap-4 font-mono">
              <div className="text-center">
                <span className="block text-xs text-cream/50">قبل</span>
                <span className="text-2xl font-bold text-red-400">{student.before}%</span>
              </div>
              <ArrowLeft className="size-6 text-gold" />
              <div className="text-center">
                <span className="block text-xs text-cream/50">بعد</span>
                <span className="text-3xl font-extrabold text-emerald-300">
                  {student.after}%
                </span>
              </div>
            </div>
          </div>

          {/* story card (cream) */}
          <div className="flex flex-col bg-cream p-6 sm:p-8 lg:col-span-2">
            <Quote className="size-9 text-gold" />
            <blockquote className="mt-4 flex-1 text-pretty text-lg font-medium leading-relaxed text-navy sm:text-xl">
              {student.quote}
            </blockquote>

            <div className="mt-6 border-t border-navy/10 pt-5">
              <div className="flex items-center gap-3">
                <span className="grid size-12 place-items-center rounded-full bg-navy font-bold text-cream">
                  {student.name.charAt(0)}
                </span>
                <div>
                  <p className="font-bold text-navy">{student.name}</p>
                  <p className="text-sm text-ink-muted">{student.grade}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* student switcher */}
        <div className="reveal-item mt-6 flex flex-wrap items-center justify-center gap-3">
          {testimonials.map((t, i) => (
            <button
              key={t.name}
              type="button"
              onClick={() => setActive(i)}
              aria-pressed={active === i}
              className={cn(
                'inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold transition-all',
                active === i
                  ? 'border-navy bg-navy text-cream shadow-lg'
                  : 'border-navy/15 bg-cream/70 text-navy hover:border-navy/40',
              )}
            >
              <span
                className={cn(
                  'grid size-6 place-items-center rounded-full text-xs',
                  active === i ? 'bg-gold text-navy' : 'bg-navy/10 text-navy',
                )}
              >
                {t.name.charAt(0)}
              </span>
              {t.name}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}

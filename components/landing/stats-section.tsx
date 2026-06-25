'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { stats } from '@/lib/landing-data'

function format(n: number) {
  return n >= 1000 ? Math.round(n).toLocaleString('en-US') : Math.round(n).toString()
}

export function StatsSection() {
  const root = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = root.current
    if (!el) return

    const nums = Array.from(el.querySelectorAll<HTMLElement>('.stat-num'))
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const run = () => {
      nums.forEach((node) => {
        const target = Number(node.dataset.value)
        const valueEl = node.firstChild as HTMLElement | null
        if (!valueEl) return
        if (reduce) {
          valueEl.textContent = format(target)
          return
        }
        const obj = { v: 0 }
        gsap.to(obj, {
          v: target,
          duration: 2,
          ease: 'power2.out',
          onUpdate: () => {
            valueEl.textContent = format(obj.v)
          },
        })
      })
    }

    let done = false
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && !done) {
            done = true
            run()
            observer.disconnect()
          }
        }
      },
      { rootMargin: '0px 0px -10% 0px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <section ref={root} id="stats" className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <span className="text-sm font-semibold text-gold-deep">
            <span className="font-mono">{'// '}</span>
            أرقامنا
          </span>
          <h2 className="mt-3 text-balance text-3xl font-extrabold leading-tight text-navy sm:text-4xl lg:text-5xl">
            نتائج بتتكلم عن نفسها
          </h2>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-ink-muted">
            سنين من الخبرة وآلاف الطلاب اللي وصلوا لأعلى الدرجات مع مستر عبد السلام.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-3xl border border-navy/10 bg-navy/10 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-cream/80 p-8 backdrop-blur md:p-10">
              <div className="flex items-baseline gap-1 text-navy">
                <span
                  className="stat-num font-mono text-5xl font-black md:text-4xl lg:text-5xl xl:text-6xl"
                  data-value={s.value}
                >
                  0
                </span>
                <span className="font-mono text-3xl font-black text-gold-deep md:text-2xl lg:text-3xl xl:text-4xl">
                  {s.suffix}
                </span>
              </div>
              <p className="mt-3 text-pretty leading-relaxed text-ink-muted">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

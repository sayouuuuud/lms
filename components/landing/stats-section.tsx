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
    <section ref={root} id="stats" className="bg-cream py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-3xl border border-navy/10 bg-navy/10 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-cream p-8 md:p-10">
              <div className="flex items-baseline gap-1 text-navy">
                <span
                  className="stat-num font-mono text-5xl font-black md:text-6xl"
                  data-value={s.value}
                >
                  0
                </span>
                <span className="font-mono text-3xl font-black text-gold-deep md:text-4xl">
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

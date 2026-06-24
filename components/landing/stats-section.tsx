'use client'

import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { stats } from '@/lib/landing-data'

gsap.registerPlugin(ScrollTrigger)

function format(n: number) {
  return n >= 1000 ? Math.round(n).toLocaleString('en-US') : Math.round(n).toString()
}

export function StatsSection() {
  const root = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const nums = gsap.utils.toArray<HTMLElement>('.stat-num')
      nums.forEach((el) => {
        const target = Number(el.dataset.value)
        const obj = { v: 0 }
        gsap.to(obj, {
          v: target,
          duration: 2,
          ease: 'power2.out',
          scrollTrigger: { trigger: el, start: 'top 90%' },
          onUpdate: () => {
            el.firstChild!.textContent = format(obj.v)
          },
        })
      })
      gsap.from('.stat-item', {
        scrollTrigger: { trigger: root.current, start: 'top 85%' },
        y: 30,
        opacity: 0,
        duration: 0.6,
        stagger: 0.1,
        ease: 'power3.out',
      })
    },
    { scope: root },
  )

  return (
    <section ref={root} className="bg-cream py-16 md:py-20">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="grid grid-cols-2 gap-6 rounded-[2rem] border border-gold/20 bg-white p-8 shadow-sm md:grid-cols-4 md:p-12">
          {stats.map((s) => (
            <div key={s.label} className="stat-item text-center">
              <div className="flex items-center justify-center text-4xl font-extrabold text-navy md:text-5xl">
                <span
                  className="stat-num font-mono"
                  data-value={s.value}
                >
                  <span>0</span>
                </span>
                <span className="text-gold-deep">{s.suffix}</span>
              </div>
              <div className="mt-2 text-sm font-semibold text-navy/60 md:text-base">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

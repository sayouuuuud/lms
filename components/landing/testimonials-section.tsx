'use client'

import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Quote, Star } from 'lucide-react'
import { testimonials } from '@/lib/landing-data'

gsap.registerPlugin(ScrollTrigger)

export function TestimonialsSection() {
  const root = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      gsap.from('.t-head', {
        scrollTrigger: { trigger: '.t-head', start: 'top 85%' },
        y: 30,
        opacity: 0,
        duration: 0.7,
        ease: 'power3.out',
      })
      gsap.from('.t-card', {
        scrollTrigger: { trigger: '.t-grid', start: 'top 80%' },
        y: 50,
        opacity: 0,
        duration: 0.6,
        stagger: 0.12,
        ease: 'power3.out',
      })
    },
    { scope: root },
  )

  return (
    <section ref={root} id="testimonials" className="bg-cream py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="t-head mx-auto max-w-2xl text-center">
          <span className="text-sm font-bold uppercase tracking-wide text-emerald-brand">
            قصص نجاح
          </span>
          <h2 className="mt-3 text-balance text-3xl font-extrabold text-navy md:text-4xl">
            طلابنا بيتكلموا عننا
          </h2>
        </div>

        <div className="t-grid mt-14 grid gap-6 md:grid-cols-3">
          {testimonials.map((t) => (
            <figure
              key={t.name}
              className="t-card relative flex flex-col rounded-3xl border border-navy/10 bg-white p-7 shadow-sm"
            >
              <Quote className="size-9 text-gold/40" />
              <div className="mt-3 flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className="size-4 fill-gold text-gold"
                  />
                ))}
              </div>
              <blockquote className="mt-4 flex-1 text-pretty leading-relaxed text-navy/75">
                {t.quote}
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-3 border-t border-navy/10 pt-4">
                <span className="flex size-11 items-center justify-center rounded-full bg-navy text-base font-bold text-gold">
                  {t.name.charAt(0)}
                </span>
                <span>
                  <span className="block font-bold text-navy">{t.name}</span>
                  <span className="block text-sm text-navy/55">{t.grade}</span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}

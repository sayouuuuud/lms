'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const links = [
  { label: 'المنهج', href: '#features' },
  { label: 'المراحل', href: '#stages' },
  { label: 'أرقامنا', href: '#stats' },
  { label: 'آراء الطلاب', href: '#testimonials' },
]

export function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-3 md:pt-4">
      <nav
        className={cn(
          'mx-auto flex h-14 max-w-[88rem] items-center justify-between rounded-full px-3 pr-5 transition-all duration-300 md:h-16 md:pr-6',
          'border border-navy/15 bg-cream/50 shadow-lg shadow-navy/5 ring-1 ring-cream/40 backdrop-blur-xl backdrop-saturate-150',
          scrolled
            ? 'bg-cream/70 shadow-xl shadow-navy/10'
            : 'bg-cream/40',
        )}
      >
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-md bg-navy font-mono text-sm font-bold text-cream">
            ƒ(x)
          </span>
          <span className="font-heading text-xl font-bold text-navy">عبد السلام</span>
        </Link>

        <div className="hidden items-center gap-9 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="group relative text-sm font-semibold text-navy-soft transition-colors hover:text-navy"
            >
              {l.label}
              <span className="absolute -bottom-1.5 right-0 h-0.5 w-0 bg-gold transition-all duration-300 group-hover:w-full" />
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <Link
            href="/auth"
            className="rounded-full px-5 py-2.5 text-sm font-bold text-navy transition-colors hover:bg-navy/5"
          >
            تسجيل الدخول
          </Link>
          <Link
            href="/auth?mode=register"
            className="inline-flex items-center rounded-full bg-navy px-6 py-2.5 text-sm font-bold text-cream transition-transform duration-200 hover:-translate-y-0.5 hover:bg-navy-deep"
          >
            ابدأ الآن
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="grid size-10 place-items-center rounded-md text-navy md:hidden"
          aria-label={open ? 'إغلاق القائمة' : 'فتح القائمة'}
        >
          {open ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </nav>

      {open && (
        <div className="mx-auto mt-3 max-w-6xl rounded-3xl border border-cream/40 bg-cream/80 px-5 py-4 shadow-xl shadow-navy/10 backdrop-blur-xl md:hidden">
          <div className="flex flex-col gap-1">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-3 text-base font-semibold text-navy-soft transition-colors hover:bg-navy/5 hover:text-navy"
              >
                {l.label}
              </a>
            ))}
            <div className="mt-2 flex gap-2">
              <Link
                href="/auth"
                onClick={() => setOpen(false)}
                className="flex-1 rounded-full border border-navy/15 px-6 py-3 text-center text-base font-bold text-navy"
              >
                تسجيل الدخول
              </Link>
              <Link
                href="/auth?mode=register"
                onClick={() => setOpen(false)}
                className="flex-1 rounded-full bg-navy px-6 py-3 text-center text-base font-bold text-cream"
              >
                ابدأ الآن
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

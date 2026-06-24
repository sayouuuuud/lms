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
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-colors duration-300',
        scrolled
          ? 'border-b border-navy/10 bg-cream/85 backdrop-blur-md'
          : 'border-b border-transparent',
      )}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:h-20 md:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-md bg-navy font-mono text-sm font-bold text-cream">
            ƒ(x)
          </span>
          <span className="text-lg font-bold text-navy">عبد السلام</span>
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
            href="/student"
            className="rounded-full px-5 py-2.5 text-sm font-bold text-navy transition-colors hover:bg-navy/5"
          >
            تسجيل الدخول
          </Link>
          <a
            href="#stages"
            className="inline-flex items-center rounded-full bg-navy px-6 py-2.5 text-sm font-bold text-cream transition-transform duration-200 hover:-translate-y-0.5 hover:bg-navy-deep"
          >
            ابدأ الآن
          </a>
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
        <div className="border-t border-navy/10 bg-cream px-5 py-4 md:hidden">
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
                href="/student"
                onClick={() => setOpen(false)}
                className="flex-1 rounded-full border border-navy/15 px-6 py-3 text-center text-base font-bold text-navy"
              >
                تسجيل الدخول
              </Link>
              <a
                href="#stages"
                onClick={() => setOpen(false)}
                className="flex-1 rounded-full bg-navy px-6 py-3 text-center text-base font-bold text-cream"
              >
                ابدأ الآن
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

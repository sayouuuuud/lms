'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Sigma, Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const links = [
  { label: 'الرئيسية', href: '#hero' },
  { label: 'مميزاتنا', href: '#features' },
  { label: 'المراحل الدراسية', href: '#stages' },
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
        'fixed inset-x-0 top-0 z-50 transition-all duration-300',
        scrolled
          ? 'border-b border-gold/15 bg-cream/85 backdrop-blur-xl shadow-sm'
          : 'bg-transparent',
      )}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-8">
        {/* Logo */}
        <Link href="#hero" className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-navy text-gold shadow-lg shadow-navy/20">
            <Sigma className="size-6" />
          </span>
          <span className="leading-tight">
            <span className="block text-lg font-extrabold text-navy">
              عبد السلام
            </span>
            <span className="block text-xs font-medium text-emerald-deep">
              أستاذ الرياضيات
            </span>
          </span>
        </Link>

        {/* Desktop links */}
        <ul className="hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="rounded-full px-4 py-2 text-sm font-semibold text-navy/70 transition-colors hover:bg-navy/5 hover:text-navy"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <div className="hidden items-center gap-2 lg:flex">
          <Link
            href="/student"
            className="rounded-full px-5 py-2.5 text-sm font-bold text-navy transition-colors hover:bg-navy/5"
          >
            تسجيل الدخول
          </Link>
          <a
            href="#stages"
            className="rounded-full bg-gradient-to-l from-gold-deep to-gold px-5 py-2.5 text-sm font-bold text-navy shadow-lg shadow-gold/30 transition-transform hover:-translate-y-0.5"
          >
            ابدأ الآن
          </a>
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex size-11 items-center justify-center rounded-xl bg-navy/5 text-navy lg:hidden"
          aria-label="القائمة"
        >
          {open ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-gold/15 bg-cream/95 backdrop-blur-xl lg:hidden">
          <ul className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4">
            {links.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-xl px-4 py-3 text-sm font-semibold text-navy/80 hover:bg-navy/5"
                >
                  {l.label}
                </a>
              </li>
            ))}
            <li className="mt-2 flex gap-2">
              <Link
                href="/student"
                onClick={() => setOpen(false)}
                className="flex-1 rounded-xl border border-navy/15 px-4 py-3 text-center text-sm font-bold text-navy"
              >
                تسجيل الدخول
              </Link>
              <a
                href="#stages"
                onClick={() => setOpen(false)}
                className="flex-1 rounded-xl bg-gold px-4 py-3 text-center text-sm font-bold text-navy"
              >
                ابدأ الآن
              </a>
            </li>
          </ul>
        </div>
      )}
    </header>
  )
}

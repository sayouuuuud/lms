import Link from 'next/link'
import { Sigma, Globe, Send, MessageCircle, Phone } from 'lucide-react'

export function SiteFooter() {
  return (
    <footer className="bg-navy-deep text-cream/70 dark:bg-ink-base dark:text-ink-dim">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-4 md:px-8">
        <div className="md:col-span-2">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-gold text-navy dark:bg-teal-glow dark:text-ink-base">
              <Sigma className="size-6" />
            </span>
            <span className="leading-tight">
              <span className="block text-lg font-extrabold text-cream">
                عبد السلام
              </span>
              <span className="block text-xs text-emerald-brand">
                أستاذ الرياضيات
              </span>
            </span>
          </div>
          <p className="mt-4 max-w-sm text-pretty leading-relaxed">
            منصة تعليمية متخصصة في الرياضيات لجميع المراحل الدراسية، بأسلوب شرح
            مبسّط ومتابعة مستمرة لضمان تفوّق كل طالب.
          </p>
          <div className="mt-5 flex gap-3">
            {[Globe, Send, MessageCircle].map((Icon, i) => (
              <a
                key={i}
                href="#"
                className="flex size-10 items-center justify-center rounded-xl bg-white/10 text-cream transition-colors hover:bg-gold hover:text-navy dark:hover:bg-teal-glow dark:hover:text-ink-base"
                aria-label="تواصل اجتماعي"
              >
                <Icon className="size-5" />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-bold text-cream">روابط سريعة</h3>
          <ul className="mt-4 space-y-2 text-sm">
            <li><a href="#hero" className="hover:text-gold">الرئيسية</a></li>
            <li><a href="#features" className="hover:text-gold">مميزاتنا</a></li>
            <li><a href="#stages" className="hover:text-gold">المراحل الدراسية</a></li>
            <li><Link href="/student" className="hover:text-gold">تسجيل الدخول</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="font-bold text-cream">تواصل معنا</h3>
          <ul className="mt-4 space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <Phone className="size-4 text-gold dark:text-teal-glow" />
              <span dir="ltr">+20 100 000 0000</span>
            </li>
            <li>القاهرة، جمهورية مصر العربية</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10 py-5 text-center text-sm">
        © {new Date().getFullYear()} منصة الأستاذ عبد السلام للرياضيات — جميع
        الحقوق محفوظة.
      </div>
    </footer>
  )
}

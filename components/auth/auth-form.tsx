'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2, Lock, Mail, Phone, User, GraduationCap, Check, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

type Tab = 'login' | 'register'

const grades = [
  { value: 'sec-1', label: 'الصف الأول الثانوي' },
  { value: 'sec-2', label: 'الصف الثاني الثانوي' },
  { value: 'sec-3', label: 'الصف الثالث الثانوي' },
]

export function AuthForm({ initialTab = 'login' }: { initialTab?: Tab }) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>(initialTab)
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [doneMessage, setDoneMessage] = useState('')
  const [error, setError] = useState('')

  // login state
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  // register state
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [grade, setGrade] = useState('')
  const [password, setPassword] = useState('')

  const switchTab = (next: Tab) => {
    setTab(next)
    setDone(false)
    setError('')
    setShowPassword(false)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setDone(false)
    setError('')

    const supabase = createClient()

    try {
      if (tab === 'login') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: loginEmail.trim(),
          password: loginPassword,
        })
        if (signInError) {
          setError('البريد الإلكتروني أو كلمة السر غير صحيحة.')
          return
        }
        // Fetch role to decide destination.
        const {
          data: { user },
        } = await supabase.auth.getUser()
        let destination = '/student'
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()
          destination = profile?.role === 'admin' ? '/dashboard' : '/student'
        }
        router.push(destination)
        router.refresh()
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo:
              process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ??
              `${window.location.origin}/auth/callback`,
            data: {
              full_name: name.trim(),
              phone: phone.trim(),
              grade,
              role: 'student',
            },
          },
        })
        if (signUpError) {
          setError(
            signUpError.message.includes('already')
              ? 'البريد الإلكتروني مستخدم بالفعل.'
              : 'حصلت مشكلة أثناء إنشاء الحساب. حاول تاني.',
          )
          return
        }
        // If a session exists immediately (email confirmation disabled), go in.
        if (data.session) {
          router.push('/student')
          router.refresh()
          return
        }
        setDoneMessage(
          'تم إنشاء حسابك! بصّ على بريدك الإلكتروني وأكّد الحساب عشان تقدر تدخل.',
        )
        setDone(true)
      }
    } catch {
      setError('حصل خطأ غير متوقّع. حاول تاني.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="w-full">
      {/* Tabs */}
      <div className="relative grid grid-cols-2 rounded-full border border-navy/10 bg-cream-deep/60 p-1 dark:border-ink-line dark:bg-ink-base/60">
        <span
          className={cn(
            'absolute inset-y-1 w-[calc(50%-0.25rem)] rounded-full bg-navy shadow-sm transition-transform duration-300 dark:bg-violet-glow',
            tab === 'login' ? 'translate-x-0' : '-translate-x-full',
          )}
          aria-hidden="true"
        />
        <button
          type="button"
          onClick={() => switchTab('login')}
          className={cn(
            'relative z-10 rounded-full py-2.5 text-sm font-bold transition-colors',
            tab === 'login' ? 'text-cream' : 'text-navy-soft hover:text-navy dark:text-ink-dim dark:hover:text-ink-fg',
          )}
        >
          تسجيل الدخول
        </button>
        <button
          type="button"
          onClick={() => switchTab('register')}
          className={cn(
            'relative z-10 rounded-full py-2.5 text-sm font-bold transition-colors',
            tab === 'register' ? 'text-cream' : 'text-navy-soft hover:text-navy dark:text-ink-dim dark:hover:text-ink-fg',
          )}
        >
          حساب جديد
        </button>
      </div>

      {/* Success message */}
      {done && (
        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-emerald-brand/30 bg-emerald-brand/10 px-4 py-3 text-emerald-deep">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-emerald-brand/20">
            <Check className="size-4" />
          </span>
          <p className="text-sm font-semibold">{doneMessage}</p>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-600 dark:text-red-400">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-red-500/20">
            <AlertCircle className="size-4" />
          </span>
          <p className="text-sm font-semibold">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {tab === 'register' && (
          <Field
            id="name"
            label="الاسم بالكامل"
            icon={<User className="size-4" />}
            type="text"
            placeholder="اكتب اسمك"
            value={name}
            onChange={setName}
            autoComplete="name"
          />
        )}

        <Field
          id="email"
          label="البريد الإلكتروني"
          icon={<Mail className="size-4" />}
          type="email"
          placeholder="you@example.com"
          value={tab === 'login' ? loginEmail : email}
          onChange={tab === 'login' ? setLoginEmail : setEmail}
          autoComplete="email"
          dir="ltr"
        />

        {tab === 'register' && (
          <>
            <Field
              id="phone"
              label="رقم الموبايل"
              icon={<Phone className="size-4" />}
              type="tel"
              placeholder="01xxxxxxxxx"
              value={phone}
              onChange={setPhone}
              autoComplete="tel"
              dir="ltr"
            />

            <div className="space-y-1.5">
              <label htmlFor="grade" className="block text-sm font-semibold text-navy dark:text-ink-fg">
                الصف الدراسي
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-navy-soft dark:text-ink-dim">
                  <GraduationCap className="size-4" />
                </span>
                <select
                  id="grade"
                  required
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className={cn(
                    'h-12 w-full appearance-none rounded-xl border border-navy/15 bg-cream/60 pr-10 pl-4 text-sm font-medium text-navy outline-none transition-colors dark:border-ink-line dark:bg-ink-base/60 dark:text-ink-fg',
                    'focus:border-gold focus:ring-4 focus:ring-gold/15 dark:focus:border-teal-glow dark:focus:ring-teal-glow/15',
                    grade === '' && 'text-navy-soft dark:text-ink-dim',
                  )}
                >
                  <option value="" disabled>
                    اختار صفك
                  </option>
                  {grades.map((g) => (
                    <option key={g.value} value={g.value} className="text-navy">
                      {g.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </>
        )}

        {/* Password */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="block text-sm font-semibold text-navy dark:text-ink-fg">
              كلمة السر
            </label>
            {tab === 'login' && (
              <button type="button" className="text-xs font-semibold text-gold-deep hover:underline dark:text-teal-glow">
                نسيت كلمة السر؟
              </button>
            )}
          </div>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-navy-soft dark:text-ink-dim">
              <Lock className="size-4" />
            </span>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              required
              placeholder="••••••••"
              value={tab === 'login' ? loginPassword : password}
              onChange={(e) =>
                tab === 'login' ? setLoginPassword(e.target.value) : setPassword(e.target.value)
              }
              autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
              className={cn(
                'h-12 w-full rounded-xl border border-navy/15 bg-cream/60 pr-10 pl-11 text-sm font-medium text-navy outline-none transition-colors dark:border-ink-line dark:bg-ink-base/60 dark:text-ink-fg',
                'placeholder:text-navy-soft/60 focus:border-gold focus:ring-4 focus:ring-gold/15 dark:placeholder:text-ink-dim/60 dark:focus:border-teal-glow dark:focus:ring-teal-glow/15',
              )}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute inset-y-0 left-3 flex items-center text-navy-soft transition-colors hover:text-navy dark:text-ink-dim dark:hover:text-ink-fg"
              aria-label={showPassword ? 'إخفاء كلمة السر' : 'إظهار كلمة السر'}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className={cn(
            'mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-navy text-sm font-bold text-cream transition-all dark:bg-violet-glow dark:text-white',
            'hover:bg-navy-deep active:translate-y-px disabled:opacity-70 dark:hover:bg-violet-deep',
          )}
        >
          {submitting && <Loader2 className="size-4 animate-spin" />}
          {tab === 'login' ? 'تسجيل الدخول' : 'إنشاء الحساب'}
        </button>
      </form>

      {/* Footer switch */}
      <p className="mt-6 text-center text-sm text-navy-soft dark:text-ink-dim">
        {tab === 'login' ? (
          <>
            لسه ماعندكش حساب؟{' '}
            <button
              type="button"
              onClick={() => switchTab('register')}
              className="font-bold text-gold-deep hover:underline dark:text-teal-glow"
            >
              اعمل حساب جديد
            </button>
          </>
        ) : (
          <>
            عندك حساب بالفعل؟{' '}
            <button
              type="button"
              onClick={() => switchTab('login')}
              className="font-bold text-gold-deep hover:underline dark:text-teal-glow"
            >
              سجّل دخولك
            </button>
          </>
        )}
      </p>

      <p className="mt-4 text-center text-xs text-navy-soft/70 dark:text-ink-dim/70">
        بإنشائك حساب فإنك توافق على{' '}
        <Link href="#" className="underline hover:text-navy dark:hover:text-ink-fg">
          الشروط والأحكام
        </Link>{' '}
        و
        <Link href="#" className="underline hover:text-navy dark:hover:text-ink-fg">
          سياسة الخصوصية
        </Link>
        .
      </p>
    </div>
  )
}

function Field({
  id,
  label,
  icon,
  type,
  placeholder,
  value,
  onChange,
  autoComplete,
  dir,
}: {
  id: string
  label: string
  icon: React.ReactNode
  type: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  autoComplete?: string
  dir?: 'ltr' | 'rtl'
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-semibold text-navy dark:text-ink-fg">
        {label}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-navy-soft dark:text-ink-dim">
          {icon}
        </span>
        <input
          id={id}
          type={type}
          required
          placeholder={placeholder}
          value={value}
          dir={dir}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className={cn(
            'h-12 w-full rounded-xl border border-navy/15 bg-cream/60 pr-10 pl-4 text-sm font-medium text-navy outline-none transition-colors dark:border-ink-line dark:bg-ink-base/60 dark:text-ink-fg',
            'placeholder:text-navy-soft/60 focus:border-gold focus:ring-4 focus:ring-gold/15 dark:placeholder:text-ink-dim/60 dark:focus:border-teal-glow dark:focus:ring-teal-glow/15',
            dir === 'ltr' && 'text-left placeholder:text-right',
          )}
        />
      </div>
    </div>
  )
}

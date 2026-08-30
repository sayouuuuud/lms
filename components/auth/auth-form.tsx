'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Eye, EyeOff, Loader2, Lock, Mail, Phone, User, GraduationCap, MapPin, School, Check, AlertCircle, ShieldCheck, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { recordLogin, resolveLoginDestination } from '@/app/auth/audit-actions'
import { signIn, signOut } from 'next-auth/react'

type Tab = 'login' | 'register' | 'forgot_password' | 'reset_password'

export function AuthForm({
  initialTab = 'login',
  stages = [],
  registrationFields = { parentPhone: true, address: true, schoolName: true },
}: {
  initialTab?: Tab
  stages?: { id: string; slug: string | null; title: string }[]
  registrationFields?: { parentPhone: boolean; address: boolean; schoolName: boolean }
}) {
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
  const [parentPhone, setParentPhone] = useState('')
  const [address, setAddress] = useState('')
  const [schoolName, setSchoolName] = useState('')
  const [password, setPassword] = useState('')

  // OTP / email verification step
  const [awaitingCode, setAwaitingCode] = useState(false)
  const [code, setCode] = useState('')
  const [resending, setResending] = useState(false)

  // planId handoff: قادم من صفحة خطة عامة (/subscriptions/[planId]) — بعد إنشاء
  // الحساب وتسجيل الدخول يُحوّل الطالب لصفحة اشتراكاته مع فتح حوار الاشتراك تلقائيًا.
  const searchParams = useSearchParams()
  const handoffPlanId = searchParams.get('planId')
  const studentDestination = handoffPlanId
    ? `/student/subscriptions?planId=${encodeURIComponent(handoffPlanId)}`
    : '/student'

  const switchTab = (next: Tab) => {
    setTab(next)
    setDone(false)
    setError('')
    setShowPassword(false)
    setAwaitingCode(false)
    setCode('')
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setDone(false)
    setError('')

    try {
      if (tab === 'login') {
        const res = await signIn('credentials', {
          email: loginEmail.trim(),
          password: loginPassword,
          redirect: false,
        })
        
        if (res?.error) {
          setError('البريد الإلكتروني أو كلمة السر غير صحيحة.')
          return
        }

        const resolved = await resolveLoginDestination()

        if ('error' in resolved) {
          if (resolved.error === 'suspended') {
            await signOut({ redirect: false })
            setError('تم إيقاف حسابك. يرجى التواصل مع الإدارة.')
            return
          }
          setError('مقدرناش نكمّل تسجيل الدخول. حاول تاني.')
          return
        }

        const destination = resolved.destination === '/student' ? studentDestination : resolved.destination

        if (destination === '/admin/dashboard') {
          recordLogin().catch(() => { })
        }

        window.location.assign(destination)
        return
      } else if (tab === 'register') {
        const res = await fetch('/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email.trim(),
            password,
            full_name: name.trim(),
            phone: phone.trim(),
            grade,
            parent_phone: parentPhone.trim(),
            address: address.trim(),
            school_name: schoolName.trim(),
          }),
        })
        const result = await res.json().catch(() => ({}))
        if (!res.ok) {
          setError(result.error ?? 'حصلت مشكلة أثناء إنشاء الحساب. حاول تاني.')
          return
        }

        if (result.verified) {
          const signInRes = await signIn('credentials', {
            email: email.trim(),
            password,
            redirect: false,
          })
          if (signInRes?.error) {
            switchTab('login')
            setLoginEmail(email.trim())
            setError('تم إنشاء حسابك. سجّل دخولك للمتابعة.')
            return
          }
          window.location.assign(studentDestination)
          return
        }

        setDoneMessage(
          'بعتنالك كود تفعيل على بريدك الإلكتروني. اكتبه تحت عشان تفعّل حسابك.',
        )
        setAwaitingCode(true)
      } else if (tab === 'forgot_password') {
        const res = await fetch('/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: loginEmail.trim() }),
        })
        const result = await res.json().catch(() => ({}))
        if (!res.ok) {
          setError(result.error ?? 'حصلت مشكلة. حاول تاني.')
          return
        }
        setDoneMessage('بعتنالك كود استعادة كلمة المرور على الإيميل. اكتبه تحت مع كلمة المرور الجديدة.')
        setTab('reset_password')
        setDone(true)
      } else if (tab === 'reset_password') {
        const res = await fetch('/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: loginEmail.trim(),
            code: code.trim(),
            password: loginPassword,
          }),
        })
        const result = await res.json().catch(() => ({}))
        if (!res.ok) {
          setError(result.error ?? 'حصلت مشكلة. حاول تاني.')
          return
        }
        
        switchTab('login')
        setDone(true)
        setDoneMessage('تم تغيير كلمة المرور بنجاح. تقدر تسجل دخولك دلوقتي.')
      }
    } catch {
      setError('حصل خطأ غير متوقّع. حاول تاني.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code: code.trim() }),
      })
      const result = await res.json().catch(() => ({}))
      
      if (!res.ok) {
        setError(result.error ?? 'الكود غير صحيح أو انتهت صلاحيته. حاول تاني أو اطلب كود جديد.')
        return
      }

      const signInRes = await signIn('credentials', {
        email: email.trim(),
        password,
        redirect: false,
      })

      if (signInRes?.error) {
        switchTab('login')
        setLoginEmail(email.trim())
        setError('تم تفعيل الحساب بنجاح. الرجاء تسجيل الدخول.')
        return
      }

      window.location.assign(studentDestination)
      return
    } catch {
      setError('حصل خطأ غير متوقّع. حاول تاني.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleResend = async () => {
    setResending(true)
    setError('')

    try {
      const res = await fetch('/auth/register/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const result = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(result.error ?? 'مقدرناش نبعت الكود تاني دلوقتي. حاول مرة كمان.')
        return
      }
      setDoneMessage('بعتنالك كود جديد على بريدك الإلكتروني.')
    } catch {
      setError('حصل خطأ غير متوقّع. حاول تاني.')
    } finally {
      setResending(false)
    }
  }

  // ---- Activation-code step (after registration) --------------------------
  if (awaitingCode) {
    return (
      <div className="w-full">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-navy/5 text-navy dark:bg-violet-glow/15 dark:text-violet-glow">
            <ShieldCheck className="size-7" />
          </span>
          <h2 className="mt-4 text-xl font-extrabold text-navy dark:text-ink-fg">
            فعّل حسابك
          </h2>
          <p className="mt-2 text-sm text-navy-soft dark:text-ink-dim">
            بعتنالك كود تفعيل على{' '}
            <span className="font-bold text-navy dark:text-ink-fg" dir="ltr">
              {email}
            </span>
          </p>
        </div>

        {/* Info / success message */}
        {doneMessage && !error && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-emerald-brand/30 bg-emerald-brand/10 px-4 py-3 text-emerald-deep">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-emerald-brand/20">
              <Check className="size-4" />
            </span>
            <p className="text-sm font-semibold">{doneMessage}</p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-600 dark:text-red-400">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-red-500/20">
              <AlertCircle className="size-4" />
            </span>
            <p className="text-sm font-semibold">{error}</p>
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="code" className="block text-sm font-semibold text-navy dark:text-ink-fg">
              كود التفعيل
            </label>
            <input
              id="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              maxLength={8}
              placeholder="00000000"
              value={code}
              dir="ltr"
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
              className={cn(
                'h-14 w-full rounded-xl border border-navy/15 bg-cream/60 px-4 text-center font-mono text-2xl font-bold tracking-[0.35em] text-navy outline-none transition-colors dark:border-ink-line dark:bg-ink-base/60 dark:text-ink-fg',
                'placeholder:text-navy-soft/40 focus:border-gold focus:ring-4 focus:ring-gold/15 dark:placeholder:text-ink-dim/40 dark:focus:border-teal-glow dark:focus:ring-teal-glow/15',
              )}
            />
          </div>

          <button
            type="submit"
            disabled={submitting || code.length < 6}
            className={cn(
              'mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-navy text-sm font-bold text-cream transition-all dark:bg-violet-glow dark:text-white',
              'hover:bg-navy-deep active:translate-y-px disabled:opacity-70 dark:hover:bg-violet-deep',
            )}
          >
            {submitting && <Loader2 className="size-4 animate-spin" />}
            تأكيد وتفعيل الحساب
          </button>
        </form>

        <div className="mt-6 flex flex-col items-center gap-3 text-center text-sm">
          <p className="text-navy-soft dark:text-ink-dim">
            ماوصلكش الكود؟{' '}
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="font-bold text-gold-deep hover:underline disabled:opacity-60 dark:text-teal-glow"
            >
              {resending ? 'بنبعت...' : 'ابعت كود تاني'}
            </button>
          </p>
          <button
            type="button"
            onClick={() => switchTab('register')}
            className="inline-flex items-center gap-1.5 font-semibold text-navy-soft transition-colors hover:text-navy dark:text-ink-dim dark:hover:text-ink-fg"
          >
            <ArrowRight className="size-4" />
            الرجوع للتسجيل
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Tabs */}
      {(tab === 'login' || tab === 'register') && (
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
      )}

      {tab === 'forgot_password' && (
        <div className="mb-4 text-center">
          <h3 className="font-heading text-lg font-bold text-navy dark:text-ink-fg">استعادة كلمة المرور</h3>
          <p className="text-xs text-navy-soft dark:text-ink-dim">اكتب بريدك الإلكتروني وهنبعتلك كود تغيير كلمة المرور.</p>
        </div>
      )}

      {tab === 'reset_password' && (
        <div className="mb-4 text-center">
          <h3 className="font-heading text-lg font-bold text-navy dark:text-ink-fg">تعيين كلمة مرور جديدة</h3>
          <p className="text-xs text-navy-soft dark:text-ink-dim">اكتب الكود المرسل للإيميل مع كلمة المرور الجديدة.</p>
        </div>
      )}

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
            label="الإسم بالكامل"
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
          value={tab === 'register' ? email : loginEmail}
          onChange={tab === 'register' ? setEmail : setLoginEmail}
          autoComplete="email"
          dir="ltr"
        />

        {tab === 'reset_password' && (
          <Field
            id="code"
            label="كود الاستعادة"
            icon={<ShieldCheck className="size-4" />}
            type="text"
            placeholder="000000"
            value={code}
            onChange={setCode}
            dir="ltr"
          />
        )}

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

            {registrationFields.parentPhone && (
              <Field
                id="parent_phone"
                label="رقم ولي الأمر"
                icon={<Phone className="size-4" />}
                type="tel"
                placeholder="01xxxxxxxxx"
                value={parentPhone}
                onChange={setParentPhone}
                autoComplete="tel"
                dir="ltr"
              />
            )}

            {registrationFields.address && (
              <Field
                id="address"
                label="عنوان الطالب"
                icon={<MapPin className="size-4" />}
                type="text"
                placeholder="اكتب عنوانك"
                value={address}
                onChange={setAddress}
                autoComplete="street-address"
              />
            )}

            {registrationFields.schoolName && (
              <Field
                id="school_name"
                label="اسم المدرسة"
                icon={<School className="size-4" />}
                type="text"
                placeholder="اكتب اسم المدرسة"
                value={schoolName}
                onChange={setSchoolName}
                autoComplete="organization"
              />
            )}

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
                    'h-12 w-full appearance-none rounded-xl border border-navy/15 bg-white pr-10 pl-4 text-sm font-medium text-navy outline-none transition-colors dark:border-ink-line dark:bg-ink-base dark:text-ink-fg',
                    'focus:border-gold focus:ring-4 focus:ring-gold/15 dark:focus:border-teal-glow dark:focus:ring-teal-glow/15',
                    grade === '' && 'text-navy-soft dark:text-ink-dim',
                  )}
                >
                  <option value="" disabled>
                    اختار صفك
                  </option>
                  {stages.map((stage) => (
                    <option key={stage.id} value={stage.slug || stage.id} className="text-navy dark:text-ink-fg">
                      {stage.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </>
        )}

        {/* Password */}
        {tab !== 'forgot_password' && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="flex flex-wrap items-center gap-2 text-sm font-semibold text-navy dark:text-ink-fg"
              >
                {tab === 'reset_password' ? 'كلمة المرور الجديدة' : 'كلمة السر'}
              </label>
              {tab === 'login' && (
                <button
                  type="button"
                  onClick={() => switchTab('forgot_password')}
                  className="text-xs font-semibold text-gold-deep hover:underline dark:text-teal-glow"
                >
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
                value={tab === 'login' || tab === 'reset_password' ? loginPassword : password}
                onChange={(e) =>
                  tab === 'login' || tab === 'reset_password' ? setLoginPassword(e.target.value) : setPassword(e.target.value)
                }
                autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                className={cn(
                  'h-12 w-full rounded-xl border border-navy/15 bg-white pr-10 pl-11 text-sm font-medium text-navy outline-none transition-colors dark:border-ink-line dark:bg-ink-base dark:text-ink-fg',
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
        )}

        <button
          type="submit"
          disabled={submitting}
          className={cn(
            'mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-navy text-sm font-bold text-cream transition-all dark:bg-violet-glow dark:text-white',
            'hover:bg-navy-deep active:translate-y-px disabled:opacity-70 dark:hover:bg-violet-deep',
          )}
        >
          {submitting && <Loader2 className="size-4 animate-spin" />}
          {tab === 'login'
            ? 'تسجيل الدخول'
            : tab === 'register'
            ? 'إنشاء الحساب'
            : tab === 'forgot_password'
            ? 'إرسال كود الاستعادة'
            : 'تغيير كلمة المرور'}
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
        ) : tab === 'register' ? (
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
        ) : (
          <button
            type="button"
            onClick={() => switchTab('login')}
            className="font-bold text-gold-deep hover:underline dark:text-teal-glow"
          >
            الرجوع لتسجيل الدخول
          </button>
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
  hint,
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
  hint?: string
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
      <label
        htmlFor={id}
        className="flex flex-wrap items-center gap-2 text-sm font-semibold text-navy dark:text-ink-fg"
      >
        {label}
        {hint && (
          <span
            dir="ltr"
            className="rounded-md bg-gold/15 px-1.5 py-0.5 font-mono text-xs font-bold text-gold-deep dark:bg-teal-glow/15 dark:text-teal-glow"
          >
            {hint}
          </span>
        )}
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
            'h-12 w-full rounded-xl border border-navy/15 bg-white pr-10 pl-4 text-sm font-medium text-navy outline-none transition-colors dark:border-ink-line dark:bg-ink-base dark:text-ink-fg',
            'placeholder:text-navy-soft/60 focus:border-gold focus:ring-4 focus:ring-gold/15 dark:placeholder:text-ink-dim/60 dark:focus:border-teal-glow dark:focus:ring-teal-glow/15',
            dir === 'ltr' && 'text-left placeholder:text-right',
          )}
        />
      </div>
    </div>
  )
}

import { createAdminClient } from '@/lib/supabase/admin'
import { sendActivationCode } from '@/lib/email'
import {
  areRegistrationsAllowed,
  isEmailVerificationRequired,
} from '@/lib/settings-data'
import { NextRequest, NextResponse } from 'next/server'

type Body = {
  email?: string
  password?: string
  full_name?: string
  phone?: string
  grade?: string
}

/**
 * Registration endpoint that creates the auth user and emails a 6-digit
 * activation code via our own SMTP (Gmail) — instead of relying on the
 * default Supabase confirmation email. The user is created UNCONFIRMED;
 * the client then calls supabase.auth.verifyOtp({ type: 'signup' }).
 */
export async function POST(request: NextRequest) {
  let body: Body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'طلب غير صالح.' }, { status: 400 })
  }

  const email = body.email?.trim().toLowerCase()
  const password = body.password
  if (!email || !password) {
    return NextResponse.json(
      { error: 'البريد الإلكتروني وكلمة السر مطلوبان.' },
      { status: 400 },
    )
  }

  // Respect the admin's "allow registrations" switch.
  if (!(await areRegistrationsAllowed())) {
    return NextResponse.json(
      { error: 'التسجيل مغلق حاليًا. تواصل مع إدارة المنصة.' },
      { status: 403 },
    )
  }

  const supabase = createAdminClient()

  const userMetadata = {
    full_name: body.full_name?.trim() ?? '',
    phone: body.phone?.trim() ?? '',
    grade: body.grade ?? '',
    role: 'student',
  }

  // The admin can turn off email verification from the dashboard. When it's
  // off we create an already-confirmed user (no activation code needed); the
  // client logs in straight away.
  const verificationRequired = await isEmailVerificationRequired()

  if (!verificationRequired) {
    const { error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: userMetadata,
    })

    if (error) {
      const already =
        error.message.toLowerCase().includes('already') ||
        error.message.toLowerCase().includes('registered')
      return NextResponse.json(
        {
          error: already
            ? 'البريد الإلكتروني مستخدم بالفعل.'
            : 'حصلت مشكلة أثناء إنشاء الحساب. حاول تاني.',
        },
        { status: already ? 409 : 400 },
      )
    }

    // No verification step — the client can sign in immediately.
    return NextResponse.json({ ok: true, verified: true })
  }

  // generateLink with type 'signup' creates the (unconfirmed) user and returns
  // the email OTP we can deliver ourselves. The handle_new_user() trigger
  // populates the profile from user_metadata.
  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'signup',
    email,
    password,
    options: {
      data: userMetadata,
    },
  })

  if (error) {
    const already =
      error.message.toLowerCase().includes('already') ||
      error.message.toLowerCase().includes('registered')
    return NextResponse.json(
      {
        error: already
          ? 'البريد الإلكتروني مستخدم بالفعل.'
          : 'حصلت مشكلة أثناء إنشاء الحساب. حاول تاني.',
      },
      { status: already ? 409 : 400 },
    )
  }

  const code = data.properties?.email_otp
  if (!code) {
    return NextResponse.json(
      { error: 'تعذّر توليد كود التفعيل. حاول تاني.' },
      { status: 500 },
    )
  }

  try {
    await sendActivationCode(email, code)
  } catch {
    // The user exists but the email failed — let them retry via "resend".
    return NextResponse.json(
      { error: 'تم إنشاء الحساب لكن فشل إرسال الكود. اضغط "ابعت كود تاني".' },
      { status: 502 },
    )
  }

  return NextResponse.json({ ok: true, verified: false })
}

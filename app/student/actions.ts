'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { StudentGender } from '@/lib/students-data'
import type { Invoice, InvoiceStatus, PaymentMethod } from '@/lib/student-billing-data'

export type StudentProfile = {
  name: string
  email: string
  initials: string
  level: string
  id: string
  gender: StudentGender
  avatar?: string
}

// Build initials from the first two words of the student's name.
function buildInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'ط'
  if (parts.length === 1) return parts[0].slice(0, 2)
  return `${parts[0][0]} ${parts[1][0]}`
}

type StudentRow = {
  code: string
  name: string
  email: string | null
  gender: StudentGender
  avatar: string | null
}

// Returns the real student profile for the currently authenticated user,
// or null if there is no session / no linked student row.
export async function getCurrentStudentProfile(): Promise<StudentProfile | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('students')
    .select('code, name, email, gender, avatar')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error || !data) {
    if (error) console.log('[v0] getCurrentStudentProfile error:', error.message)
    return null
  }

  const row = data as StudentRow
  return {
    name: row.name,
    email: row.email ?? user.email ?? '',
    initials: buildInitials(row.name),
    level: row.gender === 'أنثى' ? 'طالبة' : 'طالب',
    id: row.code,
    gender: row.gender,
    avatar: row.avatar ?? undefined,
  }
}

// ── Billing ──────────────────────────────────────────────────────

// Maps the admin-side payment status to the student-facing invoice status.
function mapPaymentStatus(status: string): InvoiceStatus {
  switch (status) {
    case 'مقبول':
      return 'مدفوعة'
    case 'مرفوض':
      return 'مرفوضة'
    default:
      return 'قيد المراجعة'
  }
}

function formatPaymentDate(date: string): string {
  try {
    return new Date(date).toLocaleDateString('ar-EG', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return date
  }
}

type PaymentRow = {
  code: string
  course: string | null
  amount: number
  method: string | null
  reference: string | null
  submitted_at: string | null
  status: string
  created_at: string
}

// Returns the current student's payments mapped to the Invoice shape used
// by the billing UI.
export async function getStudentInvoices(): Promise<Invoice[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('payments')
    .select('code, course, amount, method, reference, submitted_at, status, created_at')
    .order('created_at', { ascending: false })

  if (error || !data) {
    if (error) console.log('[v0] getStudentInvoices error:', error.message)
    return []
  }

  return (data as PaymentRow[]).map((row) => ({
    id: row.code,
    course: row.course ?? 'كورس',
    instructor: '',
    amount: Number(row.amount) || 0,
    issuedAt: formatPaymentDate(row.created_at),
    dueDate: formatPaymentDate(row.created_at),
    status: mapPaymentStatus(row.status),
    method: (row.method as PaymentMethod) ?? undefined,
    reference: row.reference ?? undefined,
    submittedAt: row.submitted_at ?? undefined,
  }))
}

// Resubmits payment proof for one of the student's own payments (e.g. after
// rejection). RLS guarantees the student can only touch their own rows.
export async function resubmitPayment(
  code: string,
  method: PaymentMethod,
  reference: string,
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مسجّل الدخول.' }

  const { error } = await supabase
    .from('payments')
    .update({ method, reference, status: 'قيد المراجعة', submitted_at: 'الآن' })
    .eq('code', code)

  if (error) {
    console.log('[v0] resubmitPayment error:', error.message)
    return { error: 'تعذّر إرسال طلب الدفع. حاول تاني.' }
  }

  revalidatePath('/student/billing')
  return { success: true }
}

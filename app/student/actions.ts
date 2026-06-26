'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentStudent } from '@/lib/auth-guard'
import { getPurchasedCourses } from '@/lib/student-lectures-data'
import type { Invoice, InvoiceStatus, PaymentMethod } from '@/lib/student-billing-data'

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
  const student = await getCurrentStudent(supabase)
  if (!student) return []

  const { data, error } = await supabase
    .from('payments')
    .select('code, course, amount, method, reference, submitted_at, status, created_at')
    .eq('student_id', student.id)
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
// rejection). Scoped to the current student so a student can only touch their
// own rows.
export async function resubmitPayment(
  code: string,
  method: PaymentMethod,
  reference: string,
) {
  const supabase = await createClient()
  const student = await getCurrentStudent(supabase)
  if (!student) return { error: 'غير مسجّل الدخول.' }

  const { error } = await supabase
    .from('payments')
    .update({ method, reference, status: 'قيد المراجعة', submitted_at: 'الآن' })
    .eq('code', code)
    .eq('student_id', student.id)

  if (error) {
    console.log('[v0] resubmitPayment error:', error.message)
    return { error: 'تعذّر إرسال طلب الدفع. حاول تاني.' }
  }

  revalidatePath('/student/billing')
  return { success: true }
}

// ── Portal data ──────────────────────────────────────────────────

// Persists the student's editable profile fields (name + phone) to both the
// profiles row (auth-linked) and the students row (portal record).
export async function updateStudentProfile(input: {
  fullName: string
  phone: string
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'لازم تسجّل دخول.' }

  const fullName = input.fullName.trim()
  const phone = input.phone.trim()
  if (!fullName) return { error: 'الاسم مطلوب.' }

  const { error: profileErr } = await supabase
    .from('profiles')
    .update({ full_name: fullName, phone })
    .eq('id', user.id)

  if (profileErr) {
    console.log('[v0] updateStudentProfile error:', profileErr.message)
    return { error: 'تعذّر حفظ التغييرات. حاول تاني.' }
  }

  // Keep the portal students record in sync (best-effort).
  await supabase
    .from('students')
    .update({ name: fullName, phone })
    .eq('user_id', user.id)

  revalidatePath('/student', 'layout')
  revalidatePath('/student/settings')
  return { success: true }
}

export async function getStudentProfile() {
  const supabase = await createClient()
  const student = await getCurrentStudent(supabase)
  if (!student) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', student.user_id)
    .single()

  return {
    ...student,
    profile,
    name: profile?.full_name || student.name || 'طالب',
    email: profile?.email || 'student@platform.com',
    initials: (profile?.full_name || student.name || 'ط').substring(0, 2),
    level: student.level || 'طالب',
    gender: 'غير محدد' // From mock data if needed
  }
}

// The student's courses are the lectures they purchased (approved orders),
// drawn from the same public catalog shown on the landing page. This keeps the
// "كورساتي" view in sync with what's actually for sale and bought.
export async function getStudentEnrolledCourses() {
  const courses = await getPurchasedCourses()
  return courses.map((c) => ({
    id: c.id,
    title: c.title,
    instructor: c.instructor,
    image: c.image,
    category: c.category,
    completedLessons: c.completedLessons,
    totalLessons: c.totalLessons,
    nextLesson: c.nextLesson,
    rating: c.rating,
    durationHours: c.durationHours,
  }))
}

export async function getStudentUpcomingSchedule() {
  const supabase = await createClient()
  const student = await getCurrentStudent(supabase)
  if (!student) return []

  const { data: events } = await supabase
    .from('calendar_events')
    .select('*')
    .gte('event_date', new Date().toISOString().split('T')[0])
    .order('event_date', { ascending: true })
    .limit(5)

  if (!events) return []

  return events.map((e: any) => {
    return {
      id: e.code,
      title: e.title,
      course: e.course || 'عام',
      type: e.type,
      day: new Date(e.event_date).toLocaleDateString('ar-EG', { weekday: 'long' }),
      date: new Date(e.event_date).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' }),
      time: e.event_time,
    }
  })
}

export async function getStudentFullSchedule() {
  const supabase = await createClient()
  const student = await getCurrentStudent(supabase)
  if (!student) return []

  // Fetch all calendar events. In real app, filter by enrolled courses.
  const { data: events } = await supabase
    .from('calendar_events')
    .select('*')
    .order('event_date', { ascending: true })

  if (!events) return []

  return events.map((e: any) => {
    return {
      id: e.id,
      title: e.title,
      date: e.event_date,
      time: e.event_time,
      type: e.type,
      course: e.course || 'عام',
      instructor: 'منصة تعليمية',
      location: e.custom ? 'أونلاين' : '',
      duration: 60
    }
  })
}

export async function getStudentRecentGrades() {
  const supabase = await createClient()
  const student = await getCurrentStudent(supabase)
  if (!student) return []

  const { data: subs } = await supabase
    .from('assignment_submissions')
    .select(`
      id,
      score,
      submitted_at,
      assignments (
        title,
        points,
        courses (title)
      )
    `)
    .eq('student_id', student.id)
    .eq('status', 'مصحّح')
    .order('submitted_at', { ascending: false })
    .limit(5)

  if (!subs) return []

  return subs.map((s: any) => {
    return {
      id: s.id,
      title: s.assignments?.title,
      course: s.assignments?.courses?.title || 'عام',
      score: s.score || 0,
      total: s.assignments?.points || 0,
      date: s.submitted_at ? new Date(s.submitted_at).toLocaleDateString('ar-EG') : '',
    }
  })
}

export async function getStudentCertificates() {
  const supabase = await createClient()
  const student = await getCurrentStudent(supabase)
  if (!student) return []

  const { data: certs } = await supabase
    .from('certificates')
    .select('*')
    .eq('student_id', student.id)
    .order('issued_at', { ascending: false })

  if (!certs) return []
  return certs.map((c: any) => {
    return {
      id: c.id,
      title: c.title,
      issuer: c.issuer,
      date: new Date(c.issued_at).toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })
    }
  })
}

export async function getStudentAnnouncements() {
  const supabase = await createClient()
  const student = await getCurrentStudent(supabase)
  if (!student) return []

  const { data: notifs } = await supabase
    .from('notifications')
    .select('*')
    .or(`student_id.eq.${student.id},student_id.is.null`)
    .eq('type', 'طالب')
    .order('created_at', { ascending: false })
    .limit(5)

  if (!notifs) return []

  return notifs.map((n: any) => {
    return {
      id: n.code,
      title: n.title,
      text: n.description,
      time: new Date(n.created_at).toLocaleDateString('ar-EG'),
      course: 'منصة',
    }
  })
}

export async function getStudentLearningActivity() {
  // Weekly activity derived from lessons the student completed in the last 7
  // days (proxy: ~0.5h per completed lesson). Falls back to zeros when there's
  // no data so the chart still renders.
  const week = [
    { key: 6, day: 'السبت', hours: 0 },
    { key: 0, day: 'الأحد', hours: 0 },
    { key: 1, day: 'الإثنين', hours: 0 },
    { key: 2, day: 'الثلاثاء', hours: 0 },
    { key: 3, day: 'الأربعاء', hours: 0 },
    { key: 4, day: 'الخميس', hours: 0 },
    { key: 5, day: 'الجمعة', hours: 0 },
  ]

  const supabase = await createClient()
  const student = await getCurrentStudent(supabase)
  if (!student) return week.map(({ day, hours }) => ({ day, hours }))

  const since = new Date()
  since.setDate(since.getDate() - 7)

  const { data: progress } = await supabase
    .from('lesson_progress')
    .select('completed_at, enrollments!inner(student_id)')
    .eq('completed', true)
    .eq('enrollments.student_id', student.id)
    .gte('completed_at', since.toISOString())

  for (const row of progress ?? []) {
    if (!row.completed_at) continue
    const dow = new Date(row.completed_at).getDay() // 0=Sun..6=Sat
    const bucket = week.find((w) => w.key === dow)
    if (bucket) bucket.hours += 0.5
  }

  return week.map(({ day, hours }) => ({ day, hours }))
}

export async function getStudentExams() {
  const supabase = await createClient()
  const student = await getCurrentStudent(supabase)
  if (!student) return []

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('course_id')
    .eq('student_id', student.id)
  
  if (!enrollments || enrollments.length === 0) return []
  const courseIds = enrollments.map((e: any) => e.course_id)

  const { data: assignments } = await supabase
    .from('assignments')
    .select(`
      id,
      code,
      title,
      type,
      due_date,
      points,
      courses (title)
    `)
    .eq('type', 'اختبار')
    .in('course_id', courseIds)

  if (!assignments) return []

  const { data: submissions } = await supabase
    .from('assignment_submissions')
    .select('*')
    .eq('student_id', student.id)

  return assignments.map((a: any) => {
    const sub = submissions?.find((s: any) => s.assignment_id === a.id)
    const isCompleted = sub && sub.status === 'مصحّح'
    
    return {
      id: a.code,
      title: a.title,
      course: a.courses?.title || 'عام',
      category: 'اختبار وحدة',
      status: isCompleted ? 'مكتمل' : 'متاح',
      questions: Array(10).fill({}),
      durationMinutes: 30,
      totalPoints: a.points || 10,
      passingPercent: 50,
      score: isCompleted ? sub.score : null,
      date: new Date(a.due_date || new Date()).toLocaleDateString('ar-EG'),
      time: '—'
    }
  })
}

export async function getStudentAssignments() {
  const supabase = await createClient()
  const student = await getCurrentStudent(supabase)
  if (!student) return []

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('course_id')
    .eq('student_id', student.id)
  
  if (!enrollments || enrollments.length === 0) return []
  const courseIds = enrollments.map((e: any) => e.course_id)

  const { data: assignments } = await supabase
    .from('assignments')
    .select(`
      id,
      code,
      title,
      type,
      due_date,
      points,
      courses (title)
    `)
    .eq('type', 'تسليم')
    .in('course_id', courseIds)

  if (!assignments) return []

  const { data: submissions } = await supabase
    .from('assignment_submissions')
    .select('*')
    .eq('student_id', student.id)

  return assignments.map((a: any) => {
    const sub = submissions?.find((s: any) => s.assignment_id === a.id)
    
    return {
      id: a.code,
      title: a.title,
      course: a.courses?.title || 'عام',
      status: sub?.status || 'لم يبدأ',
      score: sub?.score || null,
      totalPoints: a.points || 10,
      dueDate: new Date(a.due_date || new Date()).toLocaleDateString('ar-EG'),
    }
  })
}

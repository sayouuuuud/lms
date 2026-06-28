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
// (updateStudentProfile lives further down, near the other profile helpers.)

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

// Maps an admin-side notification type to the student-facing notification type.
function mapNotifType(type: string): 'lesson' | 'exam' | 'assignment' | 'grade' | 'message' | 'system' {
  switch (type) {
    case 'كورس':
      return 'lesson'
    case 'اختبار':
      return 'exam'
    case 'رسالة':
      return 'message'
    case 'طالب':
      return 'system'
    default:
      return 'system'
  }
}

// Returns the full notification feed for the current student: their own
// notifications, global broadcasts, and notifications targeted at their grade.
// Read state comes from notification_reads (graceful if the table is absent).
export async function getStudentNotifications() {
  const supabase = await createClient()
  const student = await getCurrentStudent(supabase)
  if (!student) return []

  // The student's grade matches the stage slug (sec-1/sec-2/sec-3).
  const { data: profile } = await supabase
    .from('profiles')
    .select('grade')
    .eq('id', student.user_id)
    .single()
  const grade = profile?.grade as string | undefined

  // Own + broadcast.
  const filters = [`student_id.eq.${student.id}`, 'student_id.is.null']
  const { data: notifs } = await supabase
    .from('notifications')
    .select('*')
    .or(filters.join(','))
    .order('created_at', { ascending: false })
    .limit(50)

  let rows = notifs ?? []

  // Grade-targeted (column may not exist yet → ignore errors).
  if (grade) {
    const { data: gradeNotifs } = await supabase
      .from('notifications')
      .select('*')
      .eq('grade', grade)
      .order('created_at', { ascending: false })
      .limit(50)
    if (gradeNotifs?.length) {
      const seen = new Set(rows.map((r: any) => r.id))
      rows = [...rows, ...gradeNotifs.filter((r: any) => !seen.has(r.id))]
    }
  }

  // Read state from notification_reads (best-effort).
  let readIds = new Set<string>()
  const { data: reads } = await supabase
    .from('notification_reads')
    .select('notification_id')
    .eq('student_id', student.id)
  if (reads) readIds = new Set(reads.map((r: any) => r.notification_id))

  rows.sort(
    (a: any, b: any) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )

  return rows.map((n: any) => ({
    id: n.code,
    notifId: n.id,
    type: mapNotifType(n.type),
    title: n.title,
    text: n.description,
    time: new Date(n.created_at).toLocaleDateString('ar-EG', {
      day: 'numeric',
      month: 'long',
    }),
    read: readIds.has(n.id),
  }))
}

// Marks a single notification as read for the current student.
export async function markStudentNotificationRead(notifId: string) {
  const supabase = await createClient()
  const student = await getCurrentStudent(supabase)
  if (!student) return { error: 'لازم تسجّل دخول.' }

  const { error } = await supabase
    .from('notification_reads')
    .upsert(
      { notification_id: notifId, student_id: student.id },
      { onConflict: 'notification_id,student_id' },
    )
  if (error) return { error: error.message }
  revalidatePath('/student/notifications')
  return { success: true }
}

// Marks every currently-visible notification as read for the student.
export async function markAllStudentNotificationsRead(notifIds: string[]) {
  const supabase = await createClient()
  const student = await getCurrentStudent(supabase)
  if (!student) return { error: 'لازم تسجّل دخول.' }
  if (notifIds.length === 0) return { success: true }

  const { error } = await supabase.from('notification_reads').upsert(
    notifIds.map((id) => ({ notification_id: id, student_id: student.id })),
    { onConflict: 'notification_id,student_id' },
  )
  if (error) return { error: error.message }
  revalidatePath('/student/notifications')
  return { success: true }
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

// ── Profile update (student settings) ────────────────────────────
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

  // Update the profile row (source of truth for name/phone).
  const { error: profileErr } = await supabase
    .from('profiles')
    .update({ full_name: fullName, phone })
    .eq('id', user.id)
  if (profileErr) return { error: profileErr.message }

  // Keep the students row in sync when it exists.
  await supabase
    .from('students')
    .update({ name: fullName, phone })
    .eq('user_id', user.id)

  revalidatePath('/student/settings')
  revalidatePath('/student', 'layout')
  return { success: true }
}

export async function getAvailableStagesMinimal() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('stages')
    .select('id, slug, title')
    .order('sort_order', { ascending: true })

  return data || []
}

export async function setStudentGrade(grade: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'لازم تسجّل دخول.' }

  const { error } = await supabase
    .from('profiles')
    .update({ grade })
    .eq('id', user.id)

  if (error) return { error: error.message }

  // Update students table as well if necessary, but typically grade is in profiles or both
  // Here we update profiles.
  
  revalidatePath('/student', 'layout')
  return { success: true }
}

export async function updateStudentPreferences(colorPreset: string, notifPrefs: any) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'لازم تسجّل دخول.' }

  const { error } = await supabase
    .from('profiles')
    .update({ 
      color_preset: colorPreset,
      notif_prefs: notifPrefs
    })
    .eq('id', user.id)

  if (error) return { error: error.message }
  
  revalidatePath('/student/settings')
  revalidatePath('/student', 'layout')
  return { success: true }
}

export async function trackStudentDevice() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  
  const { data: student } = await supabase.from('students').select('id').eq('user_id', user.id).single();
  if (!student) return;

  const { headers } = await import('next/headers');
  const hdrs = await headers();
  
  const ip = hdrs.get('x-real-ip') || hdrs.get('x-forwarded-for') || '127.0.0.1';
  const city = hdrs.get('x-vercel-ip-city') || 'القاهرة';
  const country = hdrs.get('x-vercel-ip-country') || 'مصر';
  const ua = hdrs.get('user-agent') || '';

  let browser = 'Chrome';
  if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Edge')) browser = 'Edge';

  let os = 'Windows';
  if (ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iOS') || ua.includes('iPhone')) os = 'iOS';

  let deviceType = 'كمبيوتر مكتبي';
  if (ua.includes('Mobile') || ua.includes('Android') || ua.includes('iPhone')) deviceType = 'موبايل';
  else if (ua.includes('iPad') || ua.includes('Tablet')) deviceType = 'تابلت';

  const { data: existing } = await supabase.from('student_devices').select('sessions').eq('student_id', student.id).single();
  const sessions = (existing?.sessions || 0) + 1;

  await supabase.from('student_devices').upsert({
    student_id: student.id,
    ip,
    city,
    country,
    browser,
    os,
    device_type: deviceType,
    last_active: new Date().toISOString(),
    sessions
  }, { onConflict: 'student_id' });
}

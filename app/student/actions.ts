'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentStudent } from '@/lib/auth-guard'

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

export async function getStudentEnrolledCourses() {
  const supabase = await createClient()
  const student = await getCurrentStudent(supabase)
  if (!student) return []

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select(`
      id,
      courses (
        id,
        code,
        title,
        instructor,
        image_url,
        category,
        course_sections (
          id,
          course_lessons (id)
        )
      ),
      lesson_progress (
        id,
        completed
      )
    `)
    .eq('student_id', student.id)

  if (!enrollments) return []

  return enrollments.map((e: any) => {
    const course = e.courses
    let totalLessons = 0
    course.course_sections?.forEach((sec: any) => {
      totalLessons += sec.course_lessons?.length || 0
    })
    
    const completedLessons = e.lesson_progress?.filter((p: any) => p.completed)?.length || 0

    return {
      id: course.id,
      code: course.code,
      title: course.title,
      instructor: course.instructor || 'أستاذ',
      image: course.image_url || '/react-course.png',
      category: course.category || 'عام',
      completedLessons,
      totalLessons,
      nextLesson: 'متابعة الدرس القادم', // Simplified
    }
  })
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
  // Mock logic since we don't have time tracking per day.
  return [
    { day: 'السبت', hours: 2.5 },
    { day: 'الأحد', hours: 1.8 },
    { day: 'الإثنين', hours: 3.2 },
    { day: 'الثلاثاء', hours: 2.1 },
    { day: 'الأربعاء', hours: 4 },
    { day: 'الخميس', hours: 1.5 },
    { day: 'الجمعة', hours: 2.8 },
  ]
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


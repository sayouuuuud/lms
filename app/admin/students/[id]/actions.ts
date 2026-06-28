'use server'

import { createClient } from '@/lib/supabase/server'
import type { StudentProfile, DeviceInfo, EnrolledCourse, PaymentRecord, ExamGrade, AssignmentRecord } from '@/lib/student-profile-data'

function formatRelativeTime(date: string | Date): string {
  try {
    const d = new Date(date);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'منذ لحظات';
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `منذ ${diffInMinutes} دقيقة`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `منذ ${diffInHours} ساعة`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) return `منذ ${diffInDays} يوم`;
    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) return `منذ ${diffInMonths} شهر`;
    const diffInYears = Math.floor(diffInDays / 365);
    return `منذ ${diffInYears} سنة`;
  } catch {
    return 'غير معروف';
  }
}

function formatJoinedAt(date: string): string {
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

export async function getStudentProfileData(code: string): Promise<StudentProfile | null> {
  const supabase = await createClient()

  // 1. Fetch Student
  const { data: studentRow, error: studentError } = await supabase
    .from('students')
    .select('*')
    .eq('code', code)
    .single()

  if (studentError || !studentRow) return null

  const studentId = studentRow.id
  const student = {
    id: studentRow.code,
    name: studentRow.name,
    email: studentRow.email || '',
    phone: studentRow.phone || '',
    gender: studentRow.gender,
    avatar: studentRow.avatar || undefined,
    courses: studentRow.courses,
    progress: studentRow.progress,
    spent: studentRow.spent,
    status: studentRow.status,
    joinedAt: formatJoinedAt(studentRow.joined_at),
  }

  // 2. Fetch Device Info
  const { data: deviceRow } = await supabase
    .from('student_devices')
    .select('*')
    .eq('student_id', studentId)
    .single()

  const device: DeviceInfo = deviceRow
    ? {
        browser: deviceRow.browser,
        os: deviceRow.os,
        deviceType: deviceRow.device_type,
        ip: deviceRow.ip,
        city: deviceRow.city,
        country: deviceRow.country,
        lastActive: formatRelativeTime(deviceRow.last_active),
        sessions: deviceRow.sessions,
      }
    : {
        browser: 'غير معروف',
        os: 'غير معروف',
        deviceType: 'غير معروف',
        ip: 'غير معروف',
        city: 'غير معروف',
        country: 'غير معروف',
        lastActive: 'غير معروف',
        sessions: 0,
      }

  // 3. Fetch Courses & Enrollments
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select(`
      id,
      progress,
      enrolled_at,
      courses (
        id,
        title,
        categories (name),
        course_sections (
          course_lessons (id)
        )
      ),
      lesson_progress (
        completed,
        completed_at
      )
    `)
    .eq('student_id', studentId)

  const courses: EnrolledCourse[] = (enrollments || []).map((enrollment: any) => {
    const course = enrollment.courses
    const category = course?.categories?.name || 'عام'
    
    // Count total lessons
    let lessonsTotal = 0
    course?.course_sections?.forEach((section: any) => {
      lessonsTotal += section.course_lessons?.length || 0
    })

    // Count completed lessons
    const lessonsDone = enrollment.lesson_progress?.filter((lp: any) => lp.completed).length || 0
    const progress = lessonsTotal > 0 ? Math.round((lessonsDone / lessonsTotal) * 100) : 0

    // Find last accessed
    let lastAccessedDate = enrollment.enrolled_at
    enrollment.lesson_progress?.forEach((lp: any) => {
      if (lp.completed_at && new Date(lp.completed_at) > new Date(lastAccessedDate)) {
        lastAccessedDate = lp.completed_at
      }
    })

    return {
      id: course.id,
      name: course.title,
      category,
      progress,
      lessonsDone,
      lessonsTotal,
      lastAccessed: formatRelativeTime(lastAccessedDate),
      status: progress >= 100 ? 'مكتمل' : progress === 0 ? 'متوقف' : 'قيد التقدم',
    }
  })

  // 4. Fetch Payments
  let paymentsQuery = supabase.from('payments').select('*')
  
  if (studentRow.email && studentRow.phone) {
    paymentsQuery = paymentsQuery.or(`student_email.eq.${studentRow.email},student_phone.eq.${studentRow.phone}`)
  } else if (studentRow.email) {
    paymentsQuery = paymentsQuery.eq('student_email', studentRow.email)
  } else if (studentRow.phone) {
    paymentsQuery = paymentsQuery.eq('student_phone', studentRow.phone)
  } else {
    // If no email or phone, match by name as a fallback
    paymentsQuery = paymentsQuery.eq('student_name', studentRow.name)
  }

  const { data: paymentsData } = await paymentsQuery

  const payments: PaymentRecord[] = (paymentsData || []).map((p: any) => ({
    id: p.code || p.id,
    date: formatJoinedAt(p.created_at),
    item: p.course,
    amount: Number(p.amount),
    method: p.method as PaymentRecord['method'],
    status: p.status === 'مقبول' ? 'ناجح' : p.status === 'مرفوض' ? 'مسترد' : 'معلّق',
  }))

  const totalSpent = payments.reduce((acc, p) => p.status === 'ناجح' ? acc + p.amount : acc, 0)

  // 5. Fetch Exams
  const { data: examsData } = await supabase
    .from('exam_submissions')
    .select(`
      id,
      score,
      total,
      status,
      submitted_at,
      exams (
        title,
        course
      )
    `)
    .eq('student_id', studentId)

  const exams: ExamGrade[] = (examsData || []).map((e: any) => ({
    id: e.id,
    name: e.exams?.title || 'امتحان',
    course: e.exams?.course || 'كورس',
    score: e.score,
    total: e.total,
    date: formatJoinedAt(e.submitted_at),
    status: e.status as ExamGrade['status'],
  }))

  // 6. Fetch Assignments
  const { data: assignmentsData } = await supabase
    .from('assignment_submissions')
    .select(`
      id,
      status,
      score,
      submitted_at,
      assignments (
        title,
        due_date,
        courses (title)
      )
    `)
    .eq('student_id', studentId)

  const assignments: AssignmentRecord[] = (assignmentsData || []).map((a: any) => {
    let status: AssignmentRecord['status'] = 'لم يسلّم'
    if (a.status === 'تم التقييم' || a.status === 'مقبول') status = 'تم التسليم'
    
    return {
      id: a.id,
      name: a.assignments?.title || 'واجب',
      course: a.assignments?.courses?.title || 'كورس',
      dueDate: formatJoinedAt(a.assignments?.due_date || a.submitted_at || new Date().toISOString()),
      status,
      grade: a.score,
    }
  })

  // 7. Generate Dashboard Analytics (Mocked/Calculated for now since we don't have historical snapshots)
  const progressTrend = [
    { month: 'يناير', progress: Math.max(0, student.progress - 50) },
    { month: 'فبراير', progress: Math.max(0, student.progress - 40) },
    { month: 'مارس', progress: Math.max(0, student.progress - 30) },
    { month: 'أبريل', progress: Math.max(0, student.progress - 20) },
    { month: 'مايو', progress: Math.max(0, student.progress - 10) },
    { month: 'يونيو', progress: student.progress },
  ]

  const spendBase = Math.round(totalSpent / 6)
  const monthlySpend = [
    { month: 'يناير', amount: spendBase },
    { month: 'فبراير', amount: spendBase },
    { month: 'مارس', amount: spendBase },
    { month: 'أبريل', amount: spendBase },
    { month: 'مايو', amount: spendBase },
    { month: 'يونيو', amount: spendBase },
  ]

  // 7. Fetch all categories to build dynamic skills
  const { data: categoriesData } = await supabase.from('categories').select('name')
  const allCategories = categoriesData?.map(c => c.name) || ['الجبر', 'الهندسة الفراغية', 'التفاضل والتكامل', 'الديناميكا', 'الاستاتيكا', 'حساب المثلثات']

  const skills = allCategories.map((catName) => {
    // Find courses student is enrolled in for this category
    const enrolledInCat = courses.filter((c) => c.category === catName)
    
    let score = 0
    if (enrolledInCat.length > 0) {
      // Calculate average progress as the skill score
      const totalProgress = enrolledInCat.reduce((sum, c) => sum + c.progress, 0)
      score = Math.round(totalProgress / enrolledInCat.length)
    }

    return { subject: catName, score }
  })

  const submitted = assignments.filter((a) => a.status === 'تم التسليم').length
  const late = assignments.filter((a) => a.status === 'متأخر').length
  const missing = assignments.filter((a) => a.status === 'لم يسلّم').length
  
  const assignmentBreakdown = [
    { label: 'تم التسليم', value: submitted },
    { label: 'متأخر', value: late },
    { label: 'لم يسلّم', value: missing },
  ]

  return {
    student,
    device,
    totalSpent,
    courses,
    payments,
    exams,
    assignments,
    progressTrend,
    monthlySpend,
    skills,
    assignmentBreakdown,
  }
}

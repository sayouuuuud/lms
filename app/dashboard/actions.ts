'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth-guard'

export async function getDashboardData() {
  const supabase = await createClient()

  if (!(await requireAdmin(supabase))) {
    return { error: 'غير مسموح. لازم تكون أدمن.' }
  }

  // Fetch basic stats
  const { data: payments } = await supabase
    .from('payments')
    .select('amount, status, created_at, method, student_name, course')
    .order('created_at', { ascending: false })

  const { count: studentsCount, data: latestStudentsData } = await supabase
    .from('students')
    .select('id, name, email, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })

  const { count: coursesCount, data: latestCoursesData } = await supabase
    .from('courses')
    .select('id, title, status, created_at, students, revenue, image_url', { count: 'exact' })
    .order('created_at', { ascending: false })

  const { count: lessonsCount } = await supabase
    .from('course_lessons')
    .select('id', { count: 'exact' })

  // Processing Stats
  const approvedPayments = payments?.filter((p) => p.status === 'مقبول') || []
  const totalRevenue = approvedPayments.reduce((sum, p) => sum + Number(p.amount), 0)

  // Zero-fill arrays for charts (Jan-Jun for mockup consistency)
  const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو']
  
  // Real revenue data (we will put everything in the current month or distribute based on actual dates)
  // Since this is a newly seeded DB, most things are in the current month. Let's just create a dynamic distribution based on real dates.
  const revenueByMonth = new Array(6).fill(0)
  approvedPayments.forEach((p) => {
    const date = new Date(p.created_at)
    // Map month (0-11) to our array (0-5) if possible, else just put in the latest
    const monthIdx = date.getMonth()
    if (monthIdx < 6) revenueByMonth[monthIdx] += Number(p.amount)
    else revenueByMonth[5] += Number(p.amount) // Fallback for later months in this mockup
  })

  const revenueData = months.map((month, idx) => ({
    month,
    revenue: revenueByMonth[idx] || (idx === 5 ? totalRevenue : 0), // If no revenue, at least show current month total if it's the last one
  }))

  // Same for students
  const studentsByMonth = new Array(6).fill(0)
  latestStudentsData?.forEach((s) => {
    const date = new Date(s.created_at)
    const monthIdx = date.getMonth()
    if (monthIdx < 6) studentsByMonth[monthIdx] += 1
    else studentsByMonth[5] += 1
  })

  let cumulativeStudents = 0
  const studentsData = months.map((month, idx) => {
    cumulativeStudents += studentsByMonth[idx]
    return {
      month,
      students: cumulativeStudents || (idx === 5 ? studentsCount : 0),
    }
  })

  // Top Courses
  const topCourses = (latestCoursesData || [])
    .sort((a, b) => (b.students || 0) - (a.students || 0))
    .slice(0, 5)
    .map((c) => ({
      title: c.title,
      students: `${c.students} طالب`,
      revenue: `${c.revenue || 0} ج.م`,
      image: c.image_url || '/courses/python.png',
    }))

  // Latest Payments
  const latestPayments = (payments || []).slice(0, 5).map((p, i) => ({
    id: `#PAY-${String(1000 + i)}`,
    name: p.student_name,
    course: p.course,
    amount: `${p.amount} ج.م`,
    status: p.status === 'مقبول' ? 'ناجح' : p.status === 'قيد المراجعة' ? 'معلّق' : 'مرفوض',
  }))

  // Latest Students
  const latestStudents = (latestStudentsData || []).slice(0, 5).map((s) => ({
    name: s.name,
    email: s.email,
    time: 'مؤخراً',
  }))

  // Latest Courses
  const latestCourses = (latestCoursesData || []).slice(0, 3).map((c) => ({
    title: c.title,
    status: c.status,
    time: 'مؤخراً',
    image: c.image_url || '/courses/javascript.png',
  }))

  // Latest Messages (mocked lightly if db isn't populated with messages yet, or fetch real)
  const { data: messagesData } = await supabase
    .from('messages')
    .select('text, created_at, read, conversations(student_name)')
    .order('created_at', { ascending: false })
    .limit(5)

  const latestMessages = (messagesData || []).map((m: any) => ({
    name: m.conversations?.student_name || 'طالب غير معروف',
    text: m.text,
    time: 'مؤخراً',
    unread: !m.read,
  }))

  return {
    success: true,
    stats: {
      totalRevenue,
      totalStudents: studentsCount || 0,
      totalCourses: coursesCount || 0,
      totalLessons: lessonsCount || 0,
      salesToday: approvedPayments.filter((p) => new Date(p.created_at).toDateString() === new Date().toDateString()).reduce((sum, p) => sum + Number(p.amount), 0),
    },
    revenueData,
    studentsData,
    topCourses,
    latestPayments,
    latestStudents,
    latestCourses,
    latestMessages,
  }
}

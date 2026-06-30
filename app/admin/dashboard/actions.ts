'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth-guard'
import { lastMonths, monthKeyOf, percentChange } from '@/lib/time-series'

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
    .select('id, title, status, created_at, students, price, image', { count: 'exact' })
    .order('created_at', { ascending: false })

  const { count: lessonsCount } = await supabase
    .from('course_lessons')
    .select('id', { count: 'exact' })

  // Processing Stats
  const approvedPayments = payments?.filter((p) => p.status === 'مقبول') || []
  const totalRevenue = approvedPayments.reduce((sum, p) => sum + Number(p.amount), 0)

  // Real rolling 12-month series, bucketed by the actual calendar month each
  // payment / signup happened in. Charts slice the last 3/6/12 client-side.
  const window = lastMonths(12)
  const windowStart = window[0].start

  // Revenue per month.
  const revenueBucket: Record<string, number> = {}
  approvedPayments.forEach((p) => {
    const k = monthKeyOf(p.created_at)
    revenueBucket[k] = (revenueBucket[k] || 0) + Number(p.amount)
  })
  const revenueData = window.map((b) => ({
    month: b.month,
    revenue: revenueBucket[b.key] || 0,
  }))

  // Cumulative students. Seed with everyone who joined before the window so the
  // running total is accurate, then add each month's new signups.
  const signupsBucket: Record<string, number> = {}
  let baseStudents = 0
  latestStudentsData?.forEach((s) => {
    const date = new Date(s.created_at)
    if (date < windowStart) {
      baseStudents += 1
      return
    }
    const k = monthKeyOf(date)
    signupsBucket[k] = (signupsBucket[k] || 0) + 1
  })
  let cumulativeStudents = baseStudents
  const studentsData = window.map((b) => {
    cumulativeStudents += signupsBucket[b.key] || 0
    return { month: b.month, students: cumulativeStudents }
  })

  // Real period-over-period changes (this month vs last month) for the stat
  // cards, plus today-vs-yesterday for daily sales.
  const thisKey = window[window.length - 1].key
  const prevKey = window[window.length - 2].key
  const revThisMonth = revenueBucket[thisKey] || 0
  const revPrevMonth = revenueBucket[prevKey] || 0
  const stuThisMonth = signupsBucket[thisKey] || 0
  const stuPrevMonth = signupsBucket[prevKey] || 0

  const today = new Date().toDateString()
  const yesterday = new Date(Date.now() - 86400000).toDateString()
  const salesYesterday = approvedPayments
    .filter((p) => new Date(p.created_at).toDateString() === yesterday)
    .reduce((s, p) => s + Number(p.amount), 0)
  const salesToday = approvedPayments
    .filter((p) => new Date(p.created_at).toDateString() === today)
    .reduce((s, p) => s + Number(p.amount), 0)

  const coursesThisMonth = (latestCoursesData || []).filter(
    (c) => monthKeyOf(c.created_at) === thisKey,
  ).length

  const changes = {
    revenue: percentChange(revThisMonth, revPrevMonth),
    students: percentChange(stuThisMonth, stuPrevMonth),
    sales: percentChange(salesToday, salesYesterday),
    coursesThisMonth,
  }

  // Top Courses
  const topCourses = (latestCoursesData || [])
    .sort((a, b) => (b.students || 0) - (a.students || 0))
    .slice(0, 5)
    .map((c) => ({
      title: c.title,
      students: `${c.students} طالب`,
      revenue: `${Number(c.price?.replace(/\D/g, '') || 0) * (c.students || 0)} ج.م`,
      image: c.image || '/courses/python.png',
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
    image: c.image || '/courses/javascript.png',
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
      salesToday,
      changes,
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

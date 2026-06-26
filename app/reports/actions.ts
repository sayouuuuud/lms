'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth-guard'
import { revalidatePath } from 'next/cache'

export type ReportItem = {
  id: string
  code: string
  title: string
  type: string
  createdBy: string
  createdAt: string
  status: string
}

export async function getReports(): Promise<ReportItem[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .order('created_at', { ascending: false })

  if (error || !data) return []

  return data.map((row) => {
    const d = new Date(row.created_at)
    return {
      id: row.id,
      code: row.code,
      title: row.title,
      type: row.type,
      createdBy: row.created_by,
      createdAt: `${d.getDate()} ${d.toLocaleString('ar-EG', { month: 'short' })} ${d.getFullYear()}`,
      status: row.status,
    }
  })
}

export async function generateReport() {
  const supabase = await createClient()
  if (!(await requireAdmin(supabase))) {
    return { error: 'غير مسموح. لازم تكون أدمن.' }
  }

  const { error } = await supabase
    .from('reports')
    .insert({
      code: `REP-${Math.floor(Math.random() * 900) + 100}`,
      title: 'تقرير مخصص جديد',
      type: 'أكاديمي',
      created_by: 'الأدمن',
      status: 'قيد التجهيز',
    })

  if (error) return { error: error.message }
  revalidatePath('/reports')
  return { success: true }
}

export async function getReportsData() {
  const supabase = await createClient()

  if (!(await requireAdmin(supabase))) {
    return { error: 'غير مسموح. لازم تكون أدمن.' }
  }

  // Fetch all necessary data
  const { data: payments } = await supabase
    .from('payments')
    .select('amount, status, created_at, course')

  const { count: studentsCount, data: studentsDataRaw } = await supabase
    .from('students')
    .select('id, created_at', { count: 'exact' })

  const { count: enrollmentsCount } = await supabase
    .from('enrollments')
    .select('*', { count: 'exact' })

  const { data: coursesData } = await supabase
    .from('courses')
    .select(`
      id, title, students, revenue,
      categories ( name )
    `)

  const approvedPayments = payments?.filter((p) => p.status === 'مقبول') || []
  const totalRevenue = approvedPayments.reduce((sum, p) => sum + Number(p.amount), 0)
  const rejectedPayments = payments?.filter((p) => p.status === 'مرفوض') || []

  const reportStats = [
    { key: 'revenue', label: 'إجمالي الإيرادات', value: totalRevenue, suffix: 'ج.م', change: 0, up: true },
    { key: 'students', label: 'إجمالي الطلاب', value: studentsCount || 0, suffix: 'طالب', change: 0, up: true },
    { key: 'enrollments', label: 'الاشتراكات', value: enrollmentsCount || 0, suffix: 'اشتراك', change: 0, up: true },
    { key: 'refunds', label: 'المدفوعات المرفوضة', value: rejectedPayments.length, suffix: 'طلب', change: 0, up: false },
  ]

  // Monthly Revenue
  const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو']
  const revenueByMonth = new Array(6).fill(0)
  approvedPayments.forEach((p) => {
    const monthIdx = new Date(p.created_at).getMonth()
    if (monthIdx < 6) revenueByMonth[monthIdx] += Number(p.amount)
    else revenueByMonth[5] += Number(p.amount)
  })

  const monthlyRevenue = months.map((month, idx) => ({
    month,
    revenue: revenueByMonth[idx] || (idx === 5 ? totalRevenue : 0),
    target: (revenueByMonth[idx] || (idx === 5 ? totalRevenue : 0)) * 1.2 || 1000,
  }))

  // Students Growth
  const studentsByMonth = new Array(6).fill(0)
  studentsDataRaw?.forEach((s) => {
    const monthIdx = new Date(s.created_at).getMonth()
    if (monthIdx < 6) studentsByMonth[monthIdx] += 1
    else studentsByMonth[5] += 1
  })

  let cumulativeStudents = 0
  const studentsGrowth = months.map((month, idx) => {
    cumulativeStudents += studentsByMonth[idx]
    return {
      month,
      students: cumulativeStudents || (idx === 5 ? (studentsCount || 0) : 0),
    }
  })

  // Category Distribution
  const categoryCount: Record<string, number> = {}
  coursesData?.forEach((c) => {
    const catName = c.categories?.name || 'عام'
    categoryCount[catName] = (categoryCount[catName] || 0) + (c.students || 0)
  })

  const colors = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)']
  const categoryDistribution = Object.entries(categoryCount)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value], i) => ({
      name,
      value,
      fill: colors[i % colors.length],
    }))

  // Course Performance
  const coursePerformance = (coursesData || [])
    .sort((a, b) => (b.revenue || 0) - (a.revenue || 0))
    .slice(0, 10)
    .map((c) => ({
      title: c.title,
      category: c.categories?.name || 'عام',
      students: c.students || 0,
      revenue: c.revenue || 0,
      completion: Math.floor(Math.random() * 40) + 50, // Mocked for now until we aggregate lesson_progress
      rating: Number((Math.random() * 1 + 4).toFixed(1)), // Mocked 4.0 - 5.0
    }))

  return {
    success: true,
    reportStats,
    monthlyRevenue,
    studentsGrowth,
    categoryDistribution,
    coursePerformance,
  }
}

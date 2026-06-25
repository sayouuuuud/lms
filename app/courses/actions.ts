'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type {
  CourseLevel,
  CourseRecord,
  CourseStatus,
} from '@/lib/courses-data'

export type CourseInput = {
  title: string
  instructor: string
  category: string
  level: CourseLevel
  price: string
  status: CourseStatus
  image?: string
}

type CourseRow = {
  id: string
  code: string
  title: string
  instructor: string | null
  category: string | null
  level: CourseLevel
  students: number
  lessons: number
  duration_hours: number
  rating: number
  price: string
  status: CourseStatus
  image: string | null
}

function mapRow(row: CourseRow): CourseRecord {
  return {
    id: row.code,
    title: row.title,
    instructor: row.instructor ?? '',
    category: row.category ?? '',
    level: row.level,
    students: row.students,
    lessons: row.lessons,
    durationHours: Number(row.duration_hours),
    rating: Number(row.rating),
    price: row.price,
    status: row.status,
    image: row.image ?? '/placeholder.svg',
  }
}

export async function getCourses(): Promise<CourseRecord[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('courses')
    .select(
      'id, code, title, instructor, category, level, students, lessons, duration_hours, rating, price, status, image',
    )
    .order('created_at', { ascending: false })

  if (error) {
    console.log('[v0] getCourses error:', error.message)
    return []
  }
  return (data as CourseRow[]).map(mapRow)
}

async function generateCourseCode(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<string> {
  const { data } = await supabase
    .from('courses')
    .select('code')
    .order('code', { ascending: false })
    .limit(1)
    .maybeSingle()

  let next = 201
  if (data?.code) {
    const parsed = parseInt(String(data.code).replace(/[^0-9]/g, ''), 10)
    if (!Number.isNaN(parsed)) next = parsed + 1
  }
  return `CRS-${next}`
}

export async function createCourse(input: CourseInput) {
  const supabase = await createClient()

  const code = await generateCourseCode(supabase)
  const { error } = await supabase.from('courses').insert({
    code,
    title: input.title,
    instructor: input.instructor || null,
    category: input.category || null,
    level: input.level,
    price: input.price,
    status: input.status,
    image: input.image || null,
  })

  if (error) {
    console.log('[v0] createCourse error:', error.message)
    return { error: 'تعذّر إضافة الكورس. تأكد من صلاحياتك وحاول تاني.' }
  }

  revalidatePath('/courses')
  return { success: true }
}

export async function deleteCourse(code: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('courses').delete().eq('code', code)

  if (error) {
    console.log('[v0] deleteCourse error:', error.message)
    return { error: 'تعذّر حذف الكورس.' }
  }

  revalidatePath('/courses')
  return { success: true }
}

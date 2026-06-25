'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type {
  StudentGender,
  StudentRecord,
  StudentStatus,
} from '@/lib/students-data'

export type StudentInput = {
  name: string
  email: string
  phone: string
  gender: StudentGender
  status: StudentStatus
}

type StudentRow = {
  id: string
  code: string
  name: string
  email: string | null
  phone: string | null
  gender: StudentGender
  avatar: string | null
  courses: number
  progress: number
  spent: string
  status: StudentStatus
  joined_at: string
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

function mapRow(row: StudentRow): StudentRecord {
  return {
    // The UI uses `id` as the human-readable identifier (e.g. STD-1042),
    // so we expose `code` here while keeping the uuid internal to the DB.
    id: row.code,
    name: row.name,
    email: row.email ?? '',
    phone: row.phone ?? '',
    gender: row.gender,
    avatar: row.avatar ?? undefined,
    courses: row.courses,
    progress: row.progress,
    spent: row.spent,
    status: row.status,
    joinedAt: formatJoinedAt(row.joined_at),
  }
}

export async function getStudents(): Promise<StudentRecord[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('students')
    .select(
      'id, code, name, email, phone, gender, avatar, courses, progress, spent, status, joined_at',
    )
    .order('created_at', { ascending: false })

  if (error) {
    console.log('[v0] getStudents error:', error.message)
    return []
  }
  return (data as StudentRow[]).map(mapRow)
}

async function generateStudentCode(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<string> {
  const { data } = await supabase
    .from('students')
    .select('code')
    .order('code', { ascending: false })
    .limit(1)
    .maybeSingle()

  let next = 1043
  if (data?.code) {
    const parsed = parseInt(String(data.code).replace(/[^0-9]/g, ''), 10)
    if (!Number.isNaN(parsed)) next = parsed + 1
  }
  return `STD-${next}`
}

export async function createStudent(input: StudentInput) {
  const supabase = await createClient()

  const code = await generateStudentCode(supabase)
  const { error } = await supabase.from('students').insert({
    code,
    name: input.name,
    email: input.email || null,
    phone: input.phone || null,
    gender: input.gender,
    status: input.status,
  })

  if (error) {
    console.log('[v0] createStudent error:', error.message)
    return { error: 'تعذّر إضافة الطالب. تأكد من صلاحياتك وحاول تاني.' }
  }

  revalidatePath('/students')
  return { success: true }
}

export async function deleteStudent(code: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('students').delete().eq('code', code)

  if (error) {
    console.log('[v0] deleteStudent error:', error.message)
    return { error: 'تعذّر حذف الطالب.' }
  }

  revalidatePath('/students')
  return { success: true }
}

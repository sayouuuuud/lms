'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth-guard'
import { revalidatePath } from 'next/cache'
import { iconFromName } from '@/lib/icon-map'
import type { CategoryRecord, CategoryStatus } from '@/lib/categories-data'

export async function getCategories(): Promise<CategoryRecord[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('code', { ascending: true })

  if (error || !data) return []

  return data.map((row) => ({
    id: row.code,
    name: row.name,
    description: row.description,
    courses: row.courses,
    students: row.students,
    icon: iconFromName(row.icon),
    color: row.color,
    bg: row.bg,
    status: row.status as CategoryStatus,
  }))
}

export async function createCategory(values: {
  name: string
  description: string
  status: string
}) {
  const supabase = await createClient()
  if (!(await requireAdmin(supabase))) {
    return { error: 'غير مسموح. لازم تكون أدمن.' }
  }

  const { data: latest } = await supabase
    .from('categories')
    .select('code')
    .order('code', { ascending: false })
    .limit(1)
    .single()

  let nextNum = 1
  if (latest && latest.code.startsWith('CAT-')) {
    const num = parseInt(latest.code.replace('CAT-', ''), 10)
    if (!isNaN(num)) nextNum = num + 1
  }
  const code = `CAT-${String(nextNum).padStart(2, '0')}`

  const { error } = await supabase.from('categories').insert({
    code,
    name: values.name,
    description: values.description,
    status: values.status,
    icon: 'Layers',
    color: 'text-primary',
    bg: 'bg-primary/10',
  })

  if (error) return { error: error.message }
  revalidatePath('/categories')
  return { success: true }
}

export async function updateCategory(
  id: string,
  values: { name: string; description: string; status: string },
) {
  const supabase = await createClient()
  if (!(await requireAdmin(supabase))) {
    return { error: 'غير مسموح. لازم تكون أدمن.' }
  }

  const { error } = await supabase
    .from('categories')
    .update({
      name: values.name,
      description: values.description,
      status: values.status,
    })
    .eq('code', id)

  if (error) return { error: error.message }
  revalidatePath('/categories')
  return { success: true }
}

export async function deleteCategory(id: string) {
  const supabase = await createClient()
  if (!(await requireAdmin(supabase))) {
    return { error: 'غير مسموح. لازم تكون أدمن.' }
  }

  const { error } = await supabase.from('categories').delete().eq('code', id)
  if (error) return { error: error.message }
  revalidatePath('/categories')
  return { success: true }
}

'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth-guard'

// ── Types ─────────────────────────────────────────────────────────
export type AdminLesson = {
  id: string
  title: string
  duration: string
  isFree: boolean
  sortOrder: number
}

export type AdminLecture = {
  id: string
  slug: string
  title: string
  description: string
  price: number
  oldPrice: number | null
  badge: string | null
  sortOrder: number
  branchId: string
  branchTitle: string
  stageId: string
  stageTitle: string
  lessons: AdminLesson[]
}

export type BranchOption = {
  id: string
  title: string
  stageId: string
  stageTitle: string
}

export type LectureInput = {
  branchId: string
  title: string
  description: string
  price: number
  oldPrice: number | null
  badge: string | null
}

export type LessonInput = {
  title: string
  duration: string
  isFree: boolean
}

function slugify(input: string) {
  const base = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, '-')
    .replace(/^-+|-+$/g, '')
  const suffix = Math.random().toString(36).slice(2, 7)
  return `${base ? base.slice(0, 24) : 'item'}-${suffix}`
}

// ── Read ──────────────────────────────────────────────────────────
export async function getLecturesAdmin(): Promise<AdminLecture[]> {
  const supabase = await createClient()

  const [stagesRes, branchesRes, lecturesRes, lessonsRes] = await Promise.all([
    supabase.from('stages').select('id, title, sort_order'),
    supabase.from('branches').select('id, stage_id, title, sort_order'),
    supabase
      .from('lectures')
      .select('id, branch_id, slug, title, description, price, old_price, badge, sort_order')
      .order('sort_order', { ascending: true }),
    supabase
      .from('lessons')
      .select('id, lecture_id, title, duration, is_free, sort_order')
      .order('sort_order', { ascending: true }),
  ])

  if (lecturesRes.error) {
    console.log('[v0] getLecturesAdmin error:', lecturesRes.error.message)
    return []
  }

  const stageById = new Map<string, { title: string }>()
  for (const s of stagesRes.data ?? []) stageById.set(s.id, { title: s.title })

  const branchById = new Map<
    string,
    { title: string; stageId: string; stageTitle: string }
  >()
  for (const b of branchesRes.data ?? []) {
    branchById.set(b.id, {
      title: b.title,
      stageId: b.stage_id,
      stageTitle: stageById.get(b.stage_id)?.title ?? '',
    })
  }

  const lessonsByLecture = new Map<string, AdminLesson[]>()
  for (const row of lessonsRes.data ?? []) {
    const list = lessonsByLecture.get(row.lecture_id) ?? []
    list.push({
      id: row.id,
      title: row.title,
      duration: row.duration,
      isFree: row.is_free,
      sortOrder: row.sort_order,
    })
    lessonsByLecture.set(row.lecture_id, list)
  }

  return (lecturesRes.data ?? []).map((row) => {
    const branch = branchById.get(row.branch_id)
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      description: row.description,
      price: Number(row.price),
      oldPrice: row.old_price != null ? Number(row.old_price) : null,
      badge: row.badge,
      sortOrder: row.sort_order,
      branchId: row.branch_id,
      branchTitle: branch?.title ?? '',
      stageId: branch?.stageId ?? '',
      stageTitle: branch?.stageTitle ?? '',
      lessons: lessonsByLecture.get(row.id) ?? [],
    }
  })
}

export async function getBranchOptions(): Promise<BranchOption[]> {
  const supabase = await createClient()
  const [stagesRes, branchesRes] = await Promise.all([
    supabase.from('stages').select('id, title, sort_order').order('sort_order'),
    supabase
      .from('branches')
      .select('id, stage_id, title, sort_order')
      .order('sort_order'),
  ])

  const stageById = new Map<string, { title: string; order: number }>()
  for (const s of stagesRes.data ?? [])
    stageById.set(s.id, { title: s.title, order: s.sort_order })

  return (branchesRes.data ?? [])
    .map((b) => ({
      id: b.id,
      title: b.title,
      stageId: b.stage_id,
      stageTitle: stageById.get(b.stage_id)?.title ?? '',
      _stageOrder: stageById.get(b.stage_id)?.order ?? 0,
    }))
    .sort((a, b) => a._stageOrder - b._stageOrder)
    .map(({ _stageOrder, ...rest }) => rest)
}

// ── Lecture CRUD ──────────────────────────────────────────────────
export async function createLecture(input: LectureInput) {
  const supabase = await createClient()
  if (!(await requireAdmin(supabase))) return { error: 'غير مسموح. لازم تكون أدمن.' }

  const { count } = await supabase
    .from('lectures')
    .select('id', { count: 'exact', head: true })
    .eq('branch_id', input.branchId)

  const { error } = await supabase.from('lectures').insert({
    branch_id: input.branchId,
    slug: slugify(input.title),
    title: input.title,
    description: input.description,
    price: input.price,
    old_price: input.oldPrice,
    badge: input.badge,
    sort_order: (count ?? 0) + 1,
  })

  if (error) {
    console.log('[v0] createLecture error:', error.message)
    return { error: 'تعذّر إضافة المحاضرة.' }
  }
  revalidatePath('/courses')
  revalidatePath('/')
  return { success: true }
}

export async function updateLecture(id: string, input: LectureInput) {
  const supabase = await createClient()
  if (!(await requireAdmin(supabase))) return { error: 'غير مسموح. لازم تكون أدمن.' }

  const { error } = await supabase
    .from('lectures')
    .update({
      branch_id: input.branchId,
      title: input.title,
      description: input.description,
      price: input.price,
      old_price: input.oldPrice,
      badge: input.badge,
    })
    .eq('id', id)

  if (error) {
    console.log('[v0] updateLecture error:', error.message)
    return { error: 'تعذّر تحديث المحاضرة.' }
  }
  revalidatePath('/courses')
  revalidatePath('/')
  return { success: true }
}

export async function deleteLecture(id: string) {
  const supabase = await createClient()
  if (!(await requireAdmin(supabase))) return { error: 'غير مسموح. لازم تكون أدمن.' }

  const { error } = await supabase.from('lectures').delete().eq('id', id)
  if (error) {
    console.log('[v0] deleteLecture error:', error.message)
    return { error: 'تعذّر حذف المحاضرة.' }
  }
  revalidatePath('/courses')
  revalidatePath('/')
  return { success: true }
}

// ── Lesson CRUD ───────────────────────────────────────────────────
export async function createLesson(lectureId: string, input: LessonInput) {
  const supabase = await createClient()
  if (!(await requireAdmin(supabase))) return { error: 'غير مسموح. لازم تكون أدمن.' }

  const { count } = await supabase
    .from('lessons')
    .select('id', { count: 'exact', head: true })
    .eq('lecture_id', lectureId)

  const { error } = await supabase.from('lessons').insert({
    lecture_id: lectureId,
    slug: slugify(input.title),
    title: input.title,
    duration: input.duration,
    is_free: input.isFree,
    sort_order: (count ?? 0) + 1,
  })

  if (error) {
    console.log('[v0] createLesson error:', error.message)
    return { error: 'تعذّر إضافة الدرس.' }
  }
  revalidatePath('/courses')
  revalidatePath('/')
  return { success: true }
}

export async function updateLesson(id: string, input: LessonInput) {
  const supabase = await createClient()
  if (!(await requireAdmin(supabase))) return { error: 'غير مسموح. لازم تكون أدمن.' }

  const { error } = await supabase
    .from('lessons')
    .update({
      title: input.title,
      duration: input.duration,
      is_free: input.isFree,
    })
    .eq('id', id)

  if (error) {
    console.log('[v0] updateLesson error:', error.message)
    return { error: 'تعذّر تحديث الدرس.' }
  }
  revalidatePath('/courses')
  revalidatePath('/')
  return { success: true }
}

export async function deleteLesson(id: string) {
  const supabase = await createClient()
  if (!(await requireAdmin(supabase))) return { error: 'غير مسموح. لازم تكون أدمن.' }

  const { error } = await supabase.from('lessons').delete().eq('id', id)
  if (error) {
    console.log('[v0] deleteLesson error:', error.message)
    return { error: 'تعذّر حذف الدرس.' }
  }
  revalidatePath('/courses')
  revalidatePath('/')
  return { success: true }
}

'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth-guard'
import { createNotification } from '@/lib/notify'

// ── Types ─────────────────────────────────────────────────────────
export type AdminLesson = {
  id: string
  slug: string
  title: string
  duration: string
  isFree: boolean
  sortOrder: number
  videoUrl: string | null
  description: string | null
}

export type AdminLecture = {
  id: string
  slug: string
  title: string
  description: string
  price: number
  oldPrice: number | null
  badge: string | null
  image: string | null
  sortOrder: number
  releaseDate: string | null
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
  image?: string | null
  releaseDate?: string | null
}

export type LessonInput = {
  title: string
  duration: string
  isFree: boolean
  videoUrl?: string | null
  description?: string | null
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
      .select('*')
      .order('sort_order', { ascending: true }),
    supabase
      .from('lessons')
      .select('id, lecture_id, slug, title, duration, is_free, sort_order, video_url, description')
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
      slug: row.slug,
      title: row.title,
      duration: row.duration,
      isFree: row.is_free,
      sortOrder: row.sort_order,
      videoUrl: row.video_url ?? null,
      description: row.description ?? null,
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
      image: (row as any).image ?? null,
      sortOrder: row.sort_order,
      releaseDate: row.release_date ?? null,
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

  const row: Record<string, any> = {
    branch_id: input.branchId,
    slug: slugify(input.title),
    title: input.title,
    description: input.description,
    price: input.price,
    old_price: input.oldPrice,
    badge: input.badge,
    sort_order: (count ?? 0) + 1,
    release_date: input.releaseDate || null,
  }
  if (input.image) row.image = input.image

  let { error } = await supabase.from('lectures').insert(row)
  // Retry without `image` if that column doesn't exist yet (migration pending).
  if (error && /image/.test(error.message) && 'image' in row) {
    delete row.image
    ;({ error } = await supabase.from('lectures').insert(row))
  }

  if (error) {
    console.log('[v0] createLecture error:', error.message)
    return { error: 'تعذّر إضافة المحاضرة.' }
  }

  // Notify the students of this lecture's grade that a new lecture is available.
  await notifyLectureGrade(supabase, input.branchId, input.title)

  // Sync with calendar if a release date is provided
  if (input.releaseDate) {
    // Generate a unique code for the event
    const { data: latest } = await supabase.from('calendar_events').select('code').order('code', { ascending: false }).limit(1).single()
    let nextNum = 1
    if (latest && latest.code.startsWith('EVT-')) {
      const num = parseInt(latest.code.replace('EVT-', ''), 10)
      if (!isNaN(num)) nextNum = num + 1
    }
    const code = `EVT-${String(nextNum).padStart(2, '0')}`

    // Parse date and time from the input.releaseDate (which is a full ISO or datetime string)
    // Actually, if it's coming from an input type="datetime-local", it might be "YYYY-MM-DDTHH:mm"
    const parsedDate = new Date(input.releaseDate)
    const d = parsedDate.toISOString().slice(0, 10)
    const t = parsedDate.toTimeString().slice(0, 5)

    const { data: branch } = await supabase.from('branches').select('stage_id').eq('id', input.branchId).single()

    // Assuming we can get the newly created lecture ID using supabase logic or by fetching it.
    // However, insert(row) without select() doesn't return data.
    // Let's refactor the insert above to return the ID, or we fetch it.
    const { data: newLecture } = await supabase.from('lectures').select('id').eq('branch_id', input.branchId).eq('slug', row.slug).single()

    if (newLecture) {
      await supabase.from('calendar_events').insert({
        code,
        title: `موعد نزول: ${input.title}`,
        event_date: d,
        event_time: t,
        type: 'محاضرة',
        course: input.title,
        description: input.description,
        custom: false,
        lecture_id: newLecture.id,
        branch_id: input.branchId,
        stage_id: branch?.stage_id,
      })
    }
  }

  revalidatePath('/courses')
  revalidatePath('/calendar')
  revalidatePath('/')
  return { success: true }
}

// Resolves the stage slug (= grade) for a branch and notifies that grade's
// students about a newly added lecture. Best-effort; never fails the caller.
async function notifyLectureGrade(
  supabase: Awaited<ReturnType<typeof createClient>>,
  branchId: string,
  lectureTitle: string,
) {
  try {
    const { data: branch } = await supabase
      .from('branches')
      .select('stage_id, stages:stage_id ( slug )')
      .eq('id', branchId)
      .single()
    const grade = (branch as any)?.stages?.slug as string | undefined
    await createNotification({
      type: 'كورس',
      title: 'محاضرة جديدة متاحة',
      description: `تمت إضافة محاضرة "${lectureTitle}". تقدر تشوفها في صفحة تصفّح المحاضرات.`,
      grade: grade ?? null,
    })
  } catch {
    // ignore notification failures
  }
}

export async function updateLecture(id: string, input: LectureInput) {
  const supabase = await createClient()
  if (!(await requireAdmin(supabase))) return { error: 'غير مسموح. لازم تكون أدمن.' }

  const patch: Record<string, any> = {
    branch_id: input.branchId,
    title: input.title,
    description: input.description,
    price: input.price,
    old_price: input.oldPrice,
    badge: input.badge,
    release_date: input.releaseDate || null,
  }
  if (input.image !== undefined) patch.image = input.image

  let { error } = await supabase.from('lectures').update(patch).eq('id', id)
  // Retry without `image` if that column doesn't exist yet (migration pending).
  if (error && /image/.test(error.message) && 'image' in patch) {
    delete patch.image
    ;({ error } = await supabase.from('lectures').update(patch).eq('id', id))
  }

  if (error) {
    console.log('[v0] updateLecture error:', error.message)
    return { error: 'تعذّر تحديث المحاضرة.' }
  }

  // Update or create calendar event
  if (input.releaseDate) {
    const parsedDate = new Date(input.releaseDate)
    const d = parsedDate.toISOString().slice(0, 10)
    const t = parsedDate.toTimeString().slice(0, 5)

    const { data: existingEvent } = await supabase.from('calendar_events').select('code').eq('lecture_id', id).single()

    if (existingEvent) {
      await supabase.from('calendar_events').update({
        event_date: d,
        event_time: t,
        title: `موعد نزول: ${input.title}`,
        course: input.title,
        description: input.description,
      }).eq('lecture_id', id)
    } else {
      const { data: branch } = await supabase.from('branches').select('stage_id').eq('id', input.branchId).single()
      const { data: latest } = await supabase.from('calendar_events').select('code').order('code', { ascending: false }).limit(1).single()
      let nextNum = 1
      if (latest && latest.code.startsWith('EVT-')) {
        const num = parseInt(latest.code.replace('EVT-', ''), 10)
        if (!isNaN(num)) nextNum = num + 1
      }
      const code = `EVT-${String(nextNum).padStart(2, '0')}`

      await supabase.from('calendar_events').insert({
        code,
        title: `موعد نزول: ${input.title}`,
        event_date: d,
        event_time: t,
        type: 'محاضرة',
        course: input.title,
        description: input.description,
        custom: false,
        lecture_id: id,
        branch_id: input.branchId,
        stage_id: branch?.stage_id,
      })
    }
  } else {
    // If release date is removed, remove the calendar event
    await supabase.from('calendar_events').delete().eq('lecture_id', id)
  }

  revalidatePath('/courses')
  revalidatePath('/calendar')
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
    video_url: input.videoUrl ?? null,
    description: input.description ?? null,
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

  const patch: Record<string, any> = {
    title: input.title,
    duration: input.duration,
    is_free: input.isFree,
  }
  if (input.videoUrl !== undefined) patch.video_url = input.videoUrl
  if (input.description !== undefined) patch.description = input.description

  const { error } = await supabase.from('lessons').update(patch).eq('id', id)

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

// ── Single lecture / lesson detail (admin views) ──────────────────
export async function getLectureDetailAdmin(
  id: string,
): Promise<{ lecture: AdminLecture; exam: AdminExam | null } | null> {
  const supabase = await createClient()

  const { data: row, error } = await supabase
    .from('lectures')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !row) {
    console.log('[v0] getLectureDetailAdmin error:', error?.message)
    return null
  }

  const [branchRes, lessonsRes] = await Promise.all([
    supabase
      .from('branches')
      .select('id, title, stage_id, stages:stage_id ( id, title )')
      .eq('id', row.branch_id)
      .single(),
    supabase
      .from('lessons')
      .select('id, slug, title, duration, is_free, sort_order, video_url, description')
      .eq('lecture_id', id)
      .order('sort_order', { ascending: true }),
  ])

  const branch = branchRes.data as any
  const lecture: AdminLecture = {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    price: Number(row.price),
    oldPrice: row.old_price != null ? Number(row.old_price) : null,
    badge: row.badge,
    image: (row as any).image ?? null,
    sortOrder: row.sort_order,
    releaseDate: row.release_date ?? null,
    branchId: row.branch_id,
    branchTitle: branch?.title ?? '',
    stageId: branch?.stage_id ?? '',
    stageTitle: branch?.stages?.title ?? '',
    lessons: (lessonsRes.data ?? []).map((l) => ({
      id: l.id,
      slug: l.slug,
      title: l.title,
      duration: l.duration,
      isFree: l.is_free,
      sortOrder: l.sort_order,
      videoUrl: l.video_url ?? null,
      description: l.description ?? null,
    })),
  }

  const exam = await getLectureExam(supabase, id)
  return { lecture, exam }
}

export async function getLessonDetailAdmin(
  lessonId: string,
): Promise<{
  lesson: AdminLesson
  lectureId: string
  lectureTitle: string
  lectureImage: string | null
  siblings: AdminLesson[]
} | null> {
  const supabase = await createClient()

  const { data: row, error } = await supabase
    .from('lessons')
    .select('id, slug, lecture_id, title, duration, is_free, sort_order, video_url, description')
    .eq('id', lessonId)
    .single()

  if (error || !row) {
    console.log('[v0] getLessonDetailAdmin error:', error?.message)
    return null
  }

  const [lectureRes, siblingsRes] = await Promise.all([
    supabase.from('lectures').select('id, title, image').eq('id', row.lecture_id).single(),
    supabase
      .from('lessons')
      .select('id, slug, title, duration, is_free, sort_order, video_url, description')
      .eq('lecture_id', row.lecture_id)
      .order('sort_order', { ascending: true }),
  ])

  const lecture = lectureRes.data as any
  const map = (l: any): AdminLesson => ({
    id: l.id,
    slug: l.slug,
    title: l.title,
    duration: l.duration,
    isFree: l.is_free,
    sortOrder: l.sort_order,
    videoUrl: l.video_url ?? null,
    description: l.description ?? null,
  })

  return {
    lesson: map(row),
    lectureId: row.lecture_id,
    lectureTitle: lecture?.title ?? '',
    lectureImage: lecture?.image ?? null,
    siblings: (siblingsRes.data ?? []).map(map),
  }
}

// ── Lecture exam (assignment of type 'اختبار' linked to a lecture) ─
export type AdminExamQuestion = {
  id?: string
  question: string
  options: string[]
  correctIndex: number
}

export type AdminExam = {
  id: string
  code: string
  title: string
  description: string
  instructions: string[]
  points: number
  questions: AdminExamQuestion[]
}

export type ExamInput = {
  title: string
  description: string
  instructions: string[]
  points: number
  questions: AdminExamQuestion[]
}

async function getLectureExam(
  supabase: Awaited<ReturnType<typeof createClient>>,
  lectureId: string,
): Promise<AdminExam | null> {
  const { data: a } = await supabase
    .from('assignments')
    .select('id, code, title, description, instructions, points')
    .eq('lecture_id', lectureId)
    .eq('type', 'اختبار')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!a) return null

  const { data: qs } = await supabase
    .from('assignment_questions')
    .select('id, question, options, correct_index, position')
    .eq('assignment_id', a.id)
    .order('position', { ascending: true })

  return {
    id: a.id,
    code: a.code,
    title: a.title,
    description: a.description,
    instructions: (a.instructions as string[]) ?? [],
    points: a.points,
    questions: (qs ?? []).map((q) => ({
      id: q.id,
      question: q.question,
      options: (q.options as string[]) ?? [],
      correctIndex: q.correct_index,
    })),
  }
}

function examCode() {
  return `ASG-LEC-${Math.random().toString(36).slice(2, 7).toUpperCase()}`
}

// Creates or updates the lecture's exam, replacing its questions.
export async function saveLectureExam(lectureId: string, input: ExamInput) {
  const supabase = await createClient()
  if (!(await requireAdmin(supabase))) return { error: 'غير مسموح. لازم تكون أدمن.' }

  const existing = await getLectureExam(supabase, lectureId)

  let assignmentId = existing?.id
  if (assignmentId) {
    const { error } = await supabase
      .from('assignments')
      .update({
        title: input.title,
        description: input.description,
        instructions: input.instructions,
        points: input.points,
      })
      .eq('id', assignmentId)
    if (error) {
      console.log('[v0] saveLectureExam update error:', error.message)
      return { error: 'تعذّر حفظ الاختبار.' }
    }
  } else {
    const { data, error } = await supabase
      .from('assignments')
      .insert({
        code: examCode(),
        lecture_id: lectureId,
        type: 'اختبار',
        title: input.title,
        description: input.description,
        instructions: input.instructions,
        points: input.points,
      })
      .select('id')
      .single()
    if (error || !data) {
      console.log('[v0] saveLectureExam insert error:', error?.message)
      return { error: 'تعذّر إنشاء الاختبار.' }
    }
    assignmentId = data.id
  }

  // Replace questions
  await supabase.from('assignment_questions').delete().eq('assignment_id', assignmentId)
  if (input.questions.length > 0) {
    const rows = input.questions.map((q, i) => ({
      assignment_id: assignmentId,
      question: q.question,
      options: q.options,
      correct_index: q.correctIndex,
      position: i + 1,
    }))
    const { error } = await supabase.from('assignment_questions').insert(rows)
    if (error) {
      console.log('[v0] saveLectureExam questions error:', error.message)
      return { error: 'تعذّر حفظ أسئلة الاختبار.' }
    }
  }

  revalidatePath(`/admin/courses/${lectureId}`)
  revalidatePath('/courses')
  return { success: true }
}

export async function deleteLectureExam(lectureId: string) {
  const supabase = await createClient()
  if (!(await requireAdmin(supabase))) return { error: 'غير مسموح. لازم تكون أدمن.' }

  const existing = await getLectureExam(supabase, lectureId)
  if (!existing) return { success: true }

  await supabase.from('assignment_questions').delete().eq('assignment_id', existing.id)
  const { error } = await supabase.from('assignments').delete().eq('id', existing.id)
  if (error) {
    console.log('[v0] deleteLectureExam error:', error.message)
    return { error: 'تعذّر حذف الاختبار.' }
  }
  revalidatePath(`/admin/courses/${lectureId}`)
  return { success: true }
}

import 'server-only'
import { createClient } from '@/lib/supabase/server'
import type { CourseDetail, Lesson, Section } from '@/lib/student-courses-data'

// The student portal sells individual lectures (from the public catalog:
// stages → branches → lectures → lessons). A student "owns" a lecture once it
// appears in one of their APPROVED orders. This module turns those purchased
// lectures into the CourseDetail shape the portal UI already renders.

const SAMPLE_VIDEO =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'

type LectureRow = {
  id: string
  slug: string
  title: string
  description: string | null
  image?: string | null
  branches: {
    title: string | null
    image: string | null
    stages: { title: string | null } | null
  } | null
  lessons: {
    id: string
    slug: string
    title: string
    duration: string | null
    is_free: boolean
    sort_order: number | null
  }[]
}

function lectureImage(slug: string) {
  // Each lecture slug has a matching artwork under /public/lessons.
  return `/lessons/${slug}.png`
}

function mapLessons(rows: LectureRow['lessons']): Lesson[] {
  return [...rows]
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((l) => ({
      id: l.slug,
      title: l.title,
      type: 'فيديو' as const,
      duration: l.duration ?? '',
      // The student bought the lecture, so every lesson is accessible.
      completed: false,
      locked: false,
      videoUrl: SAMPLE_VIDEO,
      description:
        'درس مشروح بالفيديو خطوة بخطوة مع أمثلة محلولة وتطبيقات على المسائل.',
    }))
}

function toCourseDetail(row: LectureRow): CourseDetail {
  const lessons = mapLessons(row.lessons)
  const sections: Section[] = [
    {
      id: `${row.slug}-s1`,
      title: 'محتوى المحاضرة',
      lessons,
    },
  ]
  return {
    id: row.slug,
    title: row.title,
    instructor: 'أ. عبد السلام',
    image: row.image || lectureImage(row.slug),
    category: row.branches?.title ?? 'رياضيات',
    completedLessons: 0,
    totalLessons: lessons.length,
    nextLesson: lessons[0]?.title ?? '',
    description:
      row.description ??
      'محاضرة متكاملة تشرح الموضوع من الأساس مع تمارين وحلول نموذجية.',
    rating: 4.9,
    studentsCount: 0,
    durationHours: Math.max(1, Math.round(lessons.length * 0.4)),
    level: row.branches?.stages?.title ?? 'الثانوية العامة',
    lastUpdated: '',
    sections,
    whatYouLearn: [
      'فهم المفاهيم الأساسية للموضوع',
      'حل المسائل خطوة بخطوة',
      'تطبيقات على نماذج الامتحانات',
      'مراجعة شاملة قبل الاختبار',
    ],
  }
}

const LECTURE_SELECT = `
  id, slug, title, description, image,
  branches:branch_id ( title, image, stages:stage_id ( title ) ),
  lessons ( id, slug, title, duration, is_free, sort_order )
`

// Same projection without the optional `image` column (pre-migration fallback).
const LECTURE_SELECT_NO_IMAGE = `
  id, slug, title, description,
  branches:branch_id ( title, image, stages:stage_id ( title ) ),
  lessons ( id, slug, title, duration, is_free, sort_order )
`

// Distinct lecture ids the current student has purchased (approved orders).
async function getPurchasedLectureIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('status, order_items ( lecture_id )')
    .eq('student_id', userId)
    .eq('status', 'approved')

  if (error || !data) return []

  const ids = new Set<string>()
  for (const order of data as any[]) {
    for (const item of order.order_items ?? []) {
      if (item.lecture_id) ids.add(item.lecture_id)
    }
  }
  return [...ids]
}

// All purchased lectures as portal "courses".
export async function getPurchasedCourses(): Promise<CourseDetail[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const ids = await getPurchasedLectureIds(supabase, user.id)
  if (ids.length === 0) return []

  let res: { data: any; error: any } = await supabase
    .from('lectures')
    .select(LECTURE_SELECT)
    .in('id', ids)

  // Fall back to the legacy select (no `image`) if that column isn't there yet.
  if (res.error && /image/.test(res.error.message)) {
    res = await supabase
      .from('lectures')
      .select(LECTURE_SELECT_NO_IMAGE)
      .in('id', ids)
  }

  if (res.error || !res.data) return []
  return (res.data as unknown as LectureRow[]).map(toCourseDetail)
}

// One purchased lecture by its slug (used by the course-detail page). Returns
// undefined when the student hasn't purchased it.
export async function getPurchasedCourseDetail(
  slug: string,
): Promise<CourseDetail | undefined> {
  const courses = await getPurchasedCourses()
  return courses.find((c) => c.id === slug)
}

// One lesson inside a purchased lecture (used by the lesson player).
export async function getPurchasedLesson(
  courseSlug: string,
  lessonSlug: string,
): Promise<
  { course: CourseDetail; lesson: Lesson; index: number; all: Lesson[] } | undefined
> {
  const course = await getPurchasedCourseDetail(courseSlug)
  if (!course) return undefined
  const all = course.sections.flatMap((s) => s.lessons)
  const index = all.findIndex((l) => l.id === lessonSlug)
  if (index === -1) return undefined
  return { course, lesson: all[index], index, all }
}

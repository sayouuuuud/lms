import { prisma } from '@/lib/prisma'
import { getFreeLectureBySlug } from '@/lib/curriculum'
import { logError } from '@/lib/logger'
import type { Stage, Branch, MonthlyCourse } from '@/lib/landing-data'

const FALLBACK_VIDEO =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'

export type FreeWatchLesson = {
  id: string
  title: string
  duration: string
  description: string | null
  videoUrl: string | null
  attachments: { name: string; url: string; type: string }[]
}

export type FreeLectureWatch = {
  stage: Stage
  branch: Branch
  course: MonthlyCourse
  lecture: { id: string; title: string; description: string }
  lessons: FreeWatchLesson[]
}

/**
 * Loads a lecture explicitly marked as a free preview.
 *
 * A lecture-level flag is the administrator's promise that every lesson in
 * that lecture can be watched publicly. When the flag is set only on one
 * lesson, that single lesson is exposed and its siblings remain protected.
 */
export async function getFreeLectureWatch(
  stageSlug: string,
  branchSlug: string,
  courseSlug: string,
  lectureSlug: string,
): Promise<FreeLectureWatch | undefined> {
  const result = await getFreeLectureBySlug(stageSlug, branchSlug, courseSlug, lectureSlug)
  if (!result) return undefined

  if (!result.lecture.dbId) {
    const wholeLectureIsFree =
      result.lecture.isFree || Number(result.course.price) === 0

    const sourceLessons = result.lecture.lessons || []
    const filteredLessons = wholeLectureIsFree
      ? sourceLessons
      : sourceLessons.filter((l) => l.isFree)

    const lessons: FreeWatchLesson[] = (
      filteredLessons.length > 0 ? filteredLessons : sourceLessons
    ).map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      duration: lesson.duration,
      description: null,
      videoUrl: lesson.videoUrl || FALLBACK_VIDEO,
      attachments: [],
    }))

    return {
      stage: result.stage,
      branch: result.branch,
      course: result.course,
      lecture: {
        id: result.lecture.id,
        title: result.lecture.title,
        description: result.lecture.description,
      },
      lessons,
    }
  }

  try {
    const wholeLectureIsFree =
      result.lecture.isFree || Number(result.course.price) === 0

    const data = await prisma.lessons.findMany({
      where: {
        lecture_id: result.lecture.dbId,
        ...(wholeLectureIsFree ? {} : { is_free: true }),
      },
      select: {
        id: true,
        slug: true,
        title: true,
        duration: true,
        description: true,
        video_url: true,
        video_id: true,
        attachments: true,
        sort_order: true,
      },
      orderBy: { sort_order: 'asc' },
    })

    const lessons: FreeWatchLesson[] = data.map((row) => ({
      id: row.slug ?? '',
      title: row.title ?? '',
      duration: row.duration ?? '',
      description: row.description ?? null,
      // HLS verifies that this lesson belongs to an explicitly free lecture.
      // This keeps the R2 bucket private while avoiding a fabricated student
      // playback session for public preview content.
      videoUrl: row.video_id
        ? `/api/hls/${row.id}/master.m3u8?preview=free`
        : (row.video_url || FALLBACK_VIDEO),
      attachments: Array.isArray(row.attachments) ? (row.attachments as any[]) : [],
    }))

    return {
      stage: result.stage,
      branch: result.branch,
      course: result.course,
      lecture: {
        id: result.lecture.id,
        title: result.lecture.title,
        description: result.lecture.description,
      },
      lessons,
    }
  } catch (error: any) {
    logError('getFreeLectureWatch', error)
    return undefined
  }
}

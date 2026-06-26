import { notFound } from 'next/navigation'
import { LessonPlayer } from '@/components/student/courses/lesson-player'
import { getPurchasedLesson } from '@/lib/student-lectures-data'

export default async function Page({
  params,
}: {
  params: Promise<{ id: string; lessonId: string }>
}) {
  const { id, lessonId } = await params
  const data = await getPurchasedLesson(id, lessonId)
  if (!data) notFound()

  return (
    <LessonPlayer
        course={data.course}
        lesson={data.lesson}
        index={data.index}
        all={data.all}
      />
  )
}

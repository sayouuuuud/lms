import { notFound } from 'next/navigation'
import { StudentLayout } from '@/components/student/student-layout'
import { LessonPlayer } from '@/components/student/courses/lesson-player'
import { getLesson } from '@/lib/student-courses-data'

export default async function Page({
  params,
}: {
  params: Promise<{ id: string; lessonId: string }>
}) {
  const { id, lessonId } = await params
  const data = getLesson(id, lessonId)
  if (!data) notFound()

  return (
    <StudentLayout>
      <LessonPlayer
        course={data.course}
        lesson={data.lesson}
        index={data.index}
        all={data.all}
      />
    </StudentLayout>
  )
}

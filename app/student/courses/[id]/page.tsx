import { notFound } from 'next/navigation'
import { CourseOverview } from '@/components/student/courses/course-overview'
import { getCourseDetail } from '@/lib/student-courses-data'

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const course = getCourseDetail(id)
  if (!course) notFound()

  return (
    <CourseOverview course={course} />
  )
}

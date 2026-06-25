import { notFound } from 'next/navigation'
import { StudentLayout } from '@/components/student/student-layout'
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
    <StudentLayout>
      <CourseOverview course={course} />
    </StudentLayout>
  )
}

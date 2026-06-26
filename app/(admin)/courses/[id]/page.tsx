import { notFound } from 'next/navigation'
import { CourseDetail } from '@/components/courses/course-detail'
import { courseRecords, getCourseById } from '@/lib/courses-data'

export function generateStaticParams() {
  return courseRecords.map((course) => ({ id: course.id }))
}

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const course = getCourseById(id)

  if (!course) {
    notFound()
  }

  return <CourseDetail course={course} />
}

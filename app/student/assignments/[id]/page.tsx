import { notFound } from 'next/navigation'
import { AssignmentDetail } from '@/components/student/assignments/assignment-detail'
import { getAssignment, getCourseDetail } from '@/lib/student-courses-data'

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const assignment = getAssignment(id)
  if (!assignment) notFound()
  const course = getCourseDetail(assignment.courseId)

  return (
    <AssignmentDetail assignment={assignment} course={course} />
  )
}

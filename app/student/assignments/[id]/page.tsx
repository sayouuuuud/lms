import { notFound } from 'next/navigation'
import { StudentLayout } from '@/components/student/student-layout'
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
    <StudentLayout>
      <AssignmentDetail assignment={assignment} course={course} />
    </StudentLayout>
  )
}

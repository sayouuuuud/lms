import { notFound } from 'next/navigation'
import { AssignmentDetail } from '@/components/student/assignments/assignment-detail'
import { getAssignment, getCourseDetail } from '@/lib/student-courses-data'
import { getPurchasedAssignment } from '@/lib/student-lectures-data'

export const dynamic = 'force-dynamic'

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  // Real lecture exams (from the DB) take precedence over the legacy demo data.
  const real = await getPurchasedAssignment(id)
  if (real) {
    return <AssignmentDetail assignment={real.assignment} course={real.course} />
  }

  const assignment = getAssignment(id)
  if (!assignment) notFound()
  const course = getCourseDetail(assignment.courseId)

  return <AssignmentDetail assignment={assignment} course={course} />
}

import { StudentBrowsePage } from '@/components/student/browse/student-browse-page'
import { getCurriculum } from '@/lib/curriculum'
import { getStudentProfile, getStudentEnrolledCourses } from '@/app/student/actions'

export default async function BrowsePage() {
  const [stages, profile, enrolledCourses] = await Promise.all([
    getCurriculum(),
    getStudentProfile(),
    getStudentEnrolledCourses(),
  ])

  // The student row stores the database UUID, while getCurriculum exposes the
  // stage slug as Stage.id. getStudentProfile resolves that UUID to the slug.
  // Filter on the server so other stages are never sent to the browser.
  const studentStageId = profile?.stageId ?? null
  const ownStage = studentStageId
    ? stages.find((stage) => stage.id === studentStageId)
    : undefined
  const visibleStages = ownStage ? [ownStage] : []
  const purchasedCourseIds = enrolledCourses.map(c => c.id)

  return (
    <StudentBrowsePage
      stages={visibleStages}
      gradeLocked={!!ownStage}
      purchasedCourseIds={purchasedCourseIds}
    />
  )
}

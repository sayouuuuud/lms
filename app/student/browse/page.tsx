import { StudentBrowsePage } from '@/components/student/browse/student-browse-page'
import { getCurriculum } from '@/lib/curriculum'
import { getStudentProfile, getStudentEnrolledCourses } from '@/app/student/actions'
import { getSubscriptionAccessibleContent } from '@/lib/subscription-access'
import { auth } from '@/auth'

export default async function BrowsePage() {
  const session = await auth()
  const userId = session?.user?.id

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
  
  const subscribed = userId ? await getSubscriptionAccessibleContent(userId, new Date(), true) : { courseIds: [] }
  const allAccessibleIds = Array.from(new Set([...purchasedCourseIds, ...subscribed.courseIds]))

  return (
    <StudentBrowsePage
      stages={visibleStages}
      gradeLocked={!!ownStage}
      purchasedCourseIds={allAccessibleIds}
    />
  )
}

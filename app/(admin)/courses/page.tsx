import { getLecturesAdmin, getBranchOptions } from './actions'
import { LecturesProvider } from '@/components/courses/lectures-context'
import { LecturesPageHeader } from '@/components/courses/lectures-page-header'
import { LecturesStats } from '@/components/courses/lectures-stats'
import { LecturesGrid } from '@/components/courses/lectures-grid'
import { LectureFormModals } from '@/components/courses/lecture-form-modals'

export const dynamic = 'force-dynamic'

export default async function CoursesPage() {
  const [lectures, branchOptions] = await Promise.all([
    getLecturesAdmin(),
    getBranchOptions(),
  ])

  return (
    <LecturesProvider initialLectures={lectures} branchOptions={branchOptions}>
      <LecturesPageHeader />
      <LecturesStats />
      <LecturesGrid />
      <LectureFormModals />
    </LecturesProvider>
  )
}

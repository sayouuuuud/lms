import { StudentBrowsePage } from '@/components/student/browse/student-browse-page'
import { getCurriculum } from '@/lib/curriculum'

export default async function BrowsePage() {
  const stages = await getCurriculum()
  return <StudentBrowsePage stages={stages} />
}

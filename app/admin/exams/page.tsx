import { ExamsPageHeader } from '@/components/exams/exams-page-header'
import { ExamsStats } from '@/components/exams/exams-stats'
import { ExamsTable } from '@/components/exams/exams-table'
import { getExams } from './actions'

export default async function ExamsPage() {
  const exams = await getExams()

  return (
    <>
      <ExamsPageHeader />
      <ExamsStats exams={exams} />
      <ExamsTable initialExams={exams} />
    </>
  )
}

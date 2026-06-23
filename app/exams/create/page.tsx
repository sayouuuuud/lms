import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { ExamBuilder } from '@/components/exams/builder/exam-builder'
import { ExamBuilderHeader } from '@/components/exams/builder/exam-builder-header'

export default function CreateExamPage() {
  return (
    <DashboardLayout>
      <ExamBuilderHeader />
      <ExamBuilder />
    </DashboardLayout>
  )
}

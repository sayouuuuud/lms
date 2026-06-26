import { ExamBuilder } from '@/components/exams/builder/exam-builder'
import { ExamBuilderHeader } from '@/components/exams/builder/exam-builder-header'

export default function CreateExamPage() {
  return (
    <>
      <ExamBuilderHeader />
      <ExamBuilder />
    </>
  )
}

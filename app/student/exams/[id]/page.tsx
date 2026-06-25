import { notFound } from 'next/navigation'
import { StudentLayout } from '@/components/student/student-layout'
import { ExamDetail } from '@/components/student/exams/exam-detail'
import { getExam } from '@/lib/student-exams-data'

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const exam = getExam(id)
  if (!exam) notFound()

  return (
    <StudentLayout>
      <ExamDetail exam={exam} />
    </StudentLayout>
  )
}

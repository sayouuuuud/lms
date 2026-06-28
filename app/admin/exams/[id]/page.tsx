import { notFound } from 'next/navigation'
import { getExamDetails } from './actions'
import { ExamDetailsHeader } from '@/components/exams/exam-details-header'
import { ExamStats } from '@/components/exams/exam-stats'
import { ExamQuestionsList } from '@/components/exams/exam-questions-list'
import { ExamSubmissionsTable } from '@/components/exams/exam-submissions-table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default async function ExamDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const exam = await getExamDetails(id)

  if (!exam) {
    notFound()
  }

  return (
    <div className="space-y-8">
      <ExamDetailsHeader exam={exam} />
      <ExamStats data={exam} />

      <Tabs defaultValue="submissions" className="mt-8">
        <TabsList className="mb-4 bg-secondary/50">
          <TabsTrigger value="submissions">إجابات الطلاب</TabsTrigger>
          <TabsTrigger value="questions">الأسئلة ({exam.questions.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="submissions" className="mt-0">
          <ExamSubmissionsTable submissions={exam.submissions} />
        </TabsContent>
        
        <TabsContent value="questions" className="mt-0">
          <ExamQuestionsList questions={exam.questions} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

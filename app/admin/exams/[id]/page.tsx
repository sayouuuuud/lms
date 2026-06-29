// app/admin/exams/[id]/page.tsx
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
    <div className="relative space-y-8 pb-12">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent opacity-50 pointer-events-none" />
      
      <ExamDetailsHeader exam={exam} />
      <ExamStats data={exam} />

      <Tabs defaultValue="submissions" className="mt-8">
        <TabsList className="mb-6 h-14 w-full max-w-md bg-secondary/50 p-1.5 rounded-xl border shadow-sm">
          <TabsTrigger value="submissions" className="h-11 rounded-lg text-sm font-medium data-[state=active]:shadow-sm">إجابات الطلاب</TabsTrigger>
          <TabsTrigger value="questions" className="h-11 rounded-lg text-sm font-medium data-[state=active]:shadow-sm">الأسئلة ({exam.questions.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="submissions" className="mt-0 outline-none">
          <ExamSubmissionsTable submissions={exam.submissions} />
        </TabsContent>
        
        <TabsContent value="questions" className="mt-0 outline-none">
          <ExamQuestionsList questions={exam.questions} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

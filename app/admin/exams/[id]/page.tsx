// app/admin/exams/[id]/page.tsx
import { notFound } from 'next/navigation'
import { getExamDetails } from './actions'
import { ExamDetailsHeader } from '@/components/exams/exam-details-header'
import { ExamStats } from '@/components/exams/exam-stats'
import { ExamQuestionsList } from '@/components/exams/exam-questions-list'
import { ExamSubmissionsTable } from '@/components/exams/exam-submissions-table'
import { ExamCharts } from '@/components/exams/exam-charts'
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
    <div className="space-y-6">
      <ExamDetailsHeader exam={exam} />
      
      <Tabs defaultValue="overview" className="w-full">
        <div className="border-b">
          <TabsList className="w-full justify-start rounded-none border-b-0 bg-transparent p-0 h-auto gap-6">
            <TabsTrigger 
              value="overview" 
              className="relative rounded-none border-b-2 border-transparent bg-transparent px-2 pb-3 pt-2 font-medium text-muted-foreground shadow-none transition-none data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
            >
              نظرة عامة وإحصائيات
            </TabsTrigger>
            <TabsTrigger 
              value="submissions" 
              className="relative rounded-none border-b-2 border-transparent bg-transparent px-2 pb-3 pt-2 font-medium text-muted-foreground shadow-none transition-none data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
            >
              إجابات الطلاب ({exam.submissions.length})
            </TabsTrigger>
            <TabsTrigger 
              value="questions" 
              className="relative rounded-none border-b-2 border-transparent bg-transparent px-2 pb-3 pt-2 font-medium text-muted-foreground shadow-none transition-none data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
            >
              الأسئلة ({exam.questionsCount})
            </TabsTrigger>
          </TabsList>
        </div>
        
        <div className="mt-6">
          <TabsContent value="overview" className="m-0 outline-none space-y-6">
            <ExamStats data={exam} />
            <ExamCharts submissions={exam.submissions} />
          </TabsContent>

          <TabsContent value="submissions" className="m-0 outline-none">
            <ExamSubmissionsTable submissions={exam.submissions} />
          </TabsContent>
          
          <TabsContent value="questions" className="m-0 outline-none">
            <ExamQuestionsList questions={exam.questions} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}

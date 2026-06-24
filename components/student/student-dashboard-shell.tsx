import { StudentLayout } from './student-layout'
import { StudentWelcome } from './student-welcome'
import { StudentStats } from './student-stats'
import { ContinueLearning } from './continue-learning'
import { UpcomingSchedule } from './upcoming-schedule'
import { LearningActivityChart } from './learning-activity-chart'

export function StudentDashboardShell() {
  return (
    <StudentLayout>
      <div className="flex flex-col gap-4">
        <StudentWelcome />
        <StudentStats />

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <ContinueLearning />
          </div>
          <div className="xl:col-span-1">
            <UpcomingSchedule />
          </div>
        </div>

        <LearningActivityChart />
      </div>
    </StudentLayout>
  )
}

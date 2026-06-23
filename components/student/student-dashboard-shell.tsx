import { StudentLayout } from './student-layout'
import { StudentWelcome } from './student-welcome'
import { StudentStats } from './student-stats'
import { ContinueLearning } from './continue-learning'
import { MyCourses } from './my-courses'
import { UpcomingSchedule } from './upcoming-schedule'
import { RecentGrades } from './recent-grades'
import { LearningActivityChart } from './learning-activity-chart'
import { Announcements } from './announcements'

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

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <LearningActivityChart />
          </div>
          <div className="xl:col-span-1">
            <RecentGrades />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <MyCourses />
          <Announcements />
        </div>
      </div>
    </StudentLayout>
  )
}

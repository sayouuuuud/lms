'use client'

import { StudentLayout } from './student-layout'
import { StudentWelcome } from './student-welcome'
import { StudentStats } from './student-stats'
import { ContinueLearning } from './continue-learning'
import { MyCourses } from './my-courses'
import { UpcomingSchedule } from './upcoming-schedule'
import { RecentGrades } from './recent-grades'
import { LearningActivityChart } from './learning-activity-chart'
import { Announcements } from './announcements'
import { UpcomingExams } from './upcoming-exams'
import { WeeklyGoals } from './weekly-goals'
import { MonthlyProgress } from './monthly-progress'

export function StudentDashboardShell() {
  return (
    <StudentLayout>
      <div className="flex flex-col gap-4">
        <StudentWelcome />
        <StudentStats />

        {/* Row 1: أكمل من حيث توقفت + الجدول + الاختبارات القادمة */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="xl:col-span-1">
            <ContinueLearning />
          </div>
          <div className="xl:col-span-1">
            <UpcomingSchedule />
          </div>
          <div className="xl:col-span-1">
            <UpcomingExams />
          </div>
        </div>

        {/* Row 2: نشاط التعلم (wide) + أحدث الدرجات */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <LearningActivityChart />
          </div>
          <div className="xl:col-span-1">
            <RecentGrades />
          </div>
        </div>

        {/* Row 3: الأهداف الأسبوعية + إنجازات الشهر + إعلانات */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <WeeklyGoals />
          <MonthlyProgress />
          <Announcements />
        </div>

        {/* Row 4: كورساتي */}
        <MyCourses />
      </div>
    </StudentLayout>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from './sidebar'
import { Header } from './header'
import { PageHeader } from './page-header'
import { StatCards } from './stat-cards'
import { RevenueChart } from './revenue-chart'
import { StudentsChart } from './students-chart'
import { TopCourses } from './top-courses'
import { ActivityChart } from './activity-chart'
import { LatestMessages } from './latest-messages'
import { LatestPayments } from './latest-payments'
import { LatestStudents } from './latest-students'
import { LatestCourses } from './latest-courses'

export function DashboardShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark])

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          onMenuClick={() => setSidebarOpen(true)}
          isDark={isDark}
          onToggleTheme={() => setIsDark((v) => !v)}
        />

        <main className="flex-1 space-y-6 p-4 sm:p-6">
          <PageHeader />

          <StatCards />

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
            <div className="xl:col-span-1">
              <RevenueChart />
            </div>
            <div className="xl:col-span-1">
              <StudentsChart />
            </div>
            <div className="xl:col-span-1">
              <TopCourses />
            </div>
            <div className="xl:col-span-1">
              <ActivityChart />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
            <LatestMessages />
            <LatestPayments />
            <LatestStudents />
            <LatestCourses />
          </div>

          <footer className="flex flex-col items-center justify-between gap-2 border-t border-border pt-4 text-xs text-muted-foreground sm:flex-row-reverse">
            <span>الإصدار 1.0.0</span>
            <span>جميع الحقوق محفوظة © 2024 منصة تعليمية</span>
          </footer>
        </main>
      </div>
    </div>
  )
}

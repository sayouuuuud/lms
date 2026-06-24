'use client'

import { useState, type ReactNode } from 'react'
import { StudentSidebar } from './student-sidebar'
import { StudentHeader } from './student-header'
import { useTheme } from '@/components/theme-provider'

export function StudentLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const { isDark, toggleTheme } = useTheme()

  return (
    <div className="glass-theme flex min-h-screen bg-background">
      <StudentSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((v) => !v)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <StudentHeader
          onMenuClick={() => setSidebarOpen(true)}
          isDark={isDark}
          onToggleTheme={toggleTheme}
        />

        <main className="flex-1 space-y-6 p-4 sm:p-6">
          {children}

          <footer className="flex flex-col items-center justify-between gap-2 border-t border-border pt-4 text-xs text-muted-foreground sm:flex-row-reverse">
            <span>الإصدار 1.0.0</span>
            <span>جميع الحقوق محفوظة © 2024 منصة تعليمية</span>
          </footer>
        </main>
      </div>
    </div>
  )
}

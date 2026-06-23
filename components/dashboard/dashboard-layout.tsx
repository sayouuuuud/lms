'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { Sidebar } from './sidebar'
import { Header } from './header'

export function DashboardLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isDark, setIsDark] = useState(false)

  // استرجاع الوضع المحفوظ عند أول تحميل
  useEffect(() => {
    const stored = localStorage.getItem('theme')
    const prefersDark =
      stored === 'dark' ||
      (stored === null &&
        window.matchMedia('(prefers-color-scheme: dark)').matches)
    setIsDark(prefersDark)
  }, [])

  // تطبيق الوضع وحفظه عند أي تغيير
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
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

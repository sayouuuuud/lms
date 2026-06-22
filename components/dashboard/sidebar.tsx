'use client'

import {
  GraduationCap,
  LayoutDashboard,
  Users,
  BookOpen,
  UploadCloud,
  CreditCard,
  MessageSquare,
  Tag,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const navItems = [
  { label: 'الصفحة الرئيسية', icon: LayoutDashboard, active: true },
  { label: 'الطلاب', icon: Users },
  { label: 'الكورسات', icon: BookOpen },
  { label: 'رفع الدروس', icon: UploadCloud },
  { label: 'المدفوعات', icon: CreditCard },
  { label: 'رسائل', icon: MessageSquare },
  { label: 'خصومات و الكوبونات', icon: Tag },
  { label: 'التقارير', icon: BarChart3 },
  { label: 'الإعدادات', icon: Settings },
]

export function Sidebar({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex w-72 flex-col bg-sidebar text-sidebar-foreground transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between gap-3 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
              <GraduationCap className="size-6" />
            </div>
            <div className="leading-tight">
              <h1 className="text-base font-bold text-white">منصة تعليمية</h1>
              <p className="text-xs text-sidebar-foreground/60">لوحة الإدارة</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-sidebar-foreground hover:bg-white/10 hover:text-white lg:hidden"
          >
            <X className="size-5" />
            <span className="sr-only">إغلاق القائمة</span>
          </Button>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 px-4 py-2">
          {navItems.map((item) => (
            <a
              key={item.label}
              href="#"
              aria-current={item.active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors',
                item.active
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/30'
                  : 'text-sidebar-foreground/75 hover:bg-white/5 hover:text-white',
              )}
            >
              <item.icon className="size-5 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.active && <ChevronLeft className="size-4 opacity-70" />}
            </a>
          ))}
        </nav>

        {/* Logout */}
        <div className="border-t border-sidebar-border px-4 py-4">
          <a
            href="#"
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-sidebar-foreground/75 transition-colors hover:bg-white/5 hover:text-white"
          >
            <LogOut className="size-5" />
            <span>تسجيل الخروج</span>
          </a>
        </div>
      </aside>
    </>
  )
}

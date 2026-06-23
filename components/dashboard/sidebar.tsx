'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  GraduationCap,
  LayoutDashboard,
  Users,
  BookOpen,
  ClipboardList,
  CalendarDays,
  CreditCard,
  MessageSquare,
  Bell,
  Tag,
  FolderTree,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const navItems = [
  { label: 'الصفحة الرئيسية', icon: LayoutDashboard, href: '/' },
  { label: 'الطلاب', icon: Users, href: '/students' },
  { label: 'الكورسات', icon: BookOpen, href: '/courses' },
  { label: 'الاختبارات', icon: ClipboardList, href: '/exams' },
  { label: 'التقويم', icon: CalendarDays, href: '/calendar' },
  { label: 'التصنيفات', icon: FolderTree, href: '/categories' },
  { label: 'المدفوعات', icon: CreditCard, href: '/payments' },
  { label: 'رسائل', icon: MessageSquare, href: '/messages' },
  { label: 'الإشعارات', icon: Bell, href: '/notifications' },
  { label: 'خصومات و الكوبونات', icon: Tag, href: '/coupons' },
  { label: 'التقارير', icon: BarChart3, href: '/reports' },
  { label: 'الإعدادات', icon: Settings, href: '/settings' },
]

export function Sidebar({
  open,
  onClose,
  collapsed,
  onToggleCollapse,
}: {
  open: boolean
  onClose: () => void
  collapsed: boolean
  onToggleCollapse: () => void
}) {
  const pathname = usePathname()
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex flex-col bg-sidebar text-sidebar-foreground transition-all duration-300 md:sticky md:top-0 md:h-screen md:translate-x-0',
          open ? 'translate-x-0' : 'translate-x-full',
          collapsed ? 'w-[72px]' : 'w-72',
        )}
      >
        {/* Logo */}
        <div
          className={cn(
            'flex shrink-0 items-center gap-3 px-4 py-4',
            collapsed ? 'justify-center' : 'justify-between px-6',
          )}
        >
          {!collapsed && (
            <div className="flex items-center gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
                <GraduationCap className="size-6" />
              </div>
              <div className="leading-tight">
                <h1 className="text-base font-bold text-white">منصة تعليمية</h1>
                <p className="text-xs text-sidebar-foreground/60">لوحة الإدارة</p>
              </div>
            </div>
          )}

          {collapsed && (
            <div className="flex size-11 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
              <GraduationCap className="size-6" />
            </div>
          )}

          {/* Close on mobile */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-sidebar-foreground hover:bg-white/10 hover:text-white md:hidden"
          >
            <X className="size-5" />
            <span className="sr-only">إغلاق القائمة</span>
          </Button>

          {/* Collapse toggle on desktop */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className={cn(
              'hidden text-sidebar-foreground hover:bg-white/10 hover:text-white md:flex',
              collapsed && 'mt-0',
            )}
            aria-label={collapsed ? 'توسيع القائمة' : 'طي القائمة'}
          >
            {collapsed ? (
              <ChevronLeft className="size-4" />
            ) : (
              <ChevronRight className="size-4" />
            )}
          </Button>
        </div>

        {/* Nav */}
        <nav className="flex flex-1 flex-col justify-between px-2 py-2">
          <div className="flex flex-col gap-0.5">
          {navItems.map((item) => {
            const active =
              item.href === '/'
                ? pathname === '/'
                : pathname === item.href ||
                  pathname.startsWith(`${item.href}/`)
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={onClose}
                aria-current={active ? 'page' : undefined}
                title={collapsed ? item.label : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  collapsed ? 'justify-center px-0' : '',
                  active
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/30'
                    : 'text-sidebar-foreground/75 hover:bg-white/5 hover:text-white',
                )}
              >
                <item.icon className="size-5 shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1">{item.label}</span>
                    {active && <ChevronLeft className="size-4 opacity-70" />}
                  </>
                )}
              </Link>
            )
          })}
          </div>
        </nav>

        {/* Logout */}
        <div className="shrink-0 border-t border-sidebar-border px-2 py-2">
          <a
            href="#"
            title={collapsed ? 'تسجيل الخروج' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-sidebar-foreground/75 transition-colors hover:bg-white/5 hover:text-white',
              collapsed && 'justify-center px-0',
            )}
          >
            <LogOut className="size-5 shrink-0" />
            {!collapsed && <span>تسجيل الخروج</span>}
          </a>
        </div>
      </aside>
    </>
  )
}

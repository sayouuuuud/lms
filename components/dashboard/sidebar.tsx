'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  GraduationCap,
  LayoutDashboard,
  Users,
  BookOpen,
  CreditCard,
  MessageSquare,
  Tag,
  FolderTree,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

const navItems = [
  { label: 'الصفحة الرئيسية', icon: LayoutDashboard, href: '/' },
  { label: 'الطلاب', icon: Users, href: '/students' },
  { label: 'الكورسات', icon: BookOpen, href: '/courses' },
  { label: 'التصنيفات', icon: FolderTree, href: '/categories' },
  { label: 'المدفوعات', icon: CreditCard, href: '/payments' },
  { label: 'رسائل', icon: MessageSquare, href: '/messages' },
  { label: 'خصومات و الكوبونات', icon: Tag, href: '/coupons' },
  { label: 'التقارير', icon: BarChart3, href: '#' },
  { label: 'الإعدادات', icon: Settings, href: '#' },
]

export function Sidebar({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
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
          'fixed inset-y-0 right-0 z-50 flex w-72 flex-col bg-sidebar text-sidebar-foreground transition-transform duration-300 md:sticky md:top-0 md:h-screen md:translate-x-0',
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
            className="text-sidebar-foreground hover:bg-white/10 hover:text-white md:hidden"
          >
            <X className="size-5" />
            <span className="sr-only">إغلاق القائمة</span>
          </Button>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 px-4 py-2">
          {navItems.map((item) => {
            const active = item.href !== '#' && pathname === item.href
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={onClose}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors',
                  active
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/30'
                    : 'text-sidebar-foreground/75 hover:bg-white/5 hover:text-white',
                )}
              >
                <item.icon className="size-5 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {active && <ChevronLeft className="size-4 opacity-70" />}
              </Link>
            )
          })}
        </nav>

        {/* Profile */}
        <div className="px-4 pb-2">
          <a
            href="#"
            className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-3 transition-colors hover:bg-white/10"
          >
            <Avatar className="size-10 ring-2 ring-sidebar-primary/40">
              <AvatarFallback className="bg-sidebar-primary/20 text-sm font-semibold text-white">
                م أ
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 leading-tight">
              <p className="text-sm font-semibold text-white">محمد أحمد</p>
              <p className="text-xs text-sidebar-foreground/60">عرض الملف الشخصي</p>
            </div>
            <ChevronLeft className="size-4 text-sidebar-foreground/50" />
          </a>
        </div>

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

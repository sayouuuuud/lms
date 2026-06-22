'use client'

import { Bell, MessageSquare, Moon, Sun, Search, Menu, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

export function Header({
  onMenuClick,
  isDark,
  onToggleTheme,
}: {
  onMenuClick: () => void
  isDark: boolean
  onToggleTheme: () => void
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur">
      <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
        {/* Profile */}
        <div className="flex items-center gap-2">
          <Avatar className="size-10 ring-2 ring-primary/20">
            <AvatarFallback className="bg-primary/10 font-semibold text-primary">
              م أ
            </AvatarFallback>
          </Avatar>
          <div className="hidden leading-tight sm:block">
            <p className="text-sm font-bold text-foreground">محمد أحمد</p>
            <p className="text-xs text-muted-foreground">مدير المنصة</p>
          </div>
          <ChevronDown className="hidden size-4 text-muted-foreground sm:block" />
        </div>

        {/* Icon actions */}
        <div className="flex items-center gap-1">
          <IconWithBadge icon={Bell} count={8} label="الإشعارات" />
          <IconWithBadge icon={MessageSquare} count={5} label="الرسائل" />
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleTheme}
            className="text-muted-foreground hover:text-foreground"
          >
            {isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
            <span className="sr-only">تبديل الوضع الليلي</span>
          </Button>
        </div>

        {/* Search */}
        <div className="relative mx-auto hidden w-full max-w-xl md:block">
          <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="ابحث عن طالب، كورس، درس، دفعة..."
            className="h-11 w-full rounded-xl border border-border bg-secondary/60 pr-10 pl-16 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:bg-card"
          />
          <kbd className="absolute left-3 top-1/2 -translate-y-1/2 rounded-md border border-border bg-card px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            Ctrl K
          </kbd>
        </div>

        {/* Mobile menu */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="mr-auto text-foreground lg:hidden"
        >
          <Menu className="size-6" />
          <span className="sr-only">فتح القائمة</span>
        </Button>
      </div>
    </header>
  )
}

function IconWithBadge({
  icon: Icon,
  count,
  label,
}: {
  icon: typeof Bell
  count: number
  label: string
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative text-muted-foreground hover:text-foreground"
    >
      <Icon className="size-5" />
      <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
        {count}
      </span>
      <span className="sr-only">{label}</span>
    </Button>
  )
}

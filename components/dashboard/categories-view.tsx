'use client'

import {
  Plus,
  Search,
  LayoutGrid,
  BookOpen,
  Users,
  MoreHorizontal,
  ChevronLeft,
  Code2,
  Palette,
  Megaphone,
  Languages,
  Briefcase,
  Sparkles,
  Camera,
  FlaskConical,
  type LucideIcon,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { categories } from '@/lib/dashboard-data'

const iconMap: Record<string, LucideIcon> = {
  Code2,
  Palette,
  Megaphone,
  Languages,
  Briefcase,
  Sparkles,
  Camera,
  FlaskConical,
}

const colorMap: Record<string, string> = {
  blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  pink: 'bg-pink-500/10 text-pink-600 dark:text-pink-400',
  orange: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  green: 'bg-green-500/10 text-green-600 dark:text-green-400',
  indigo: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
  teal: 'bg-teal-500/10 text-teal-600 dark:text-teal-400',
  rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
}

export function CategoriesView() {
  const totalCourses = categories.reduce((sum, c) => sum + c.courses, 0)

  return (
    <>
      {/* Page header */}
      <div className="flex flex-col gap-4 lg:flex-row-reverse lg:items-center lg:justify-between">
        <div className="text-right">
          <h2 className="text-2xl font-bold text-foreground">التصنيفات</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {categories.length} تصنيف يضم {totalCourses} كورس
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="ابحث عن تصنيف..."
              className="h-10 w-full rounded-xl border border-border bg-card pr-10 pl-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary sm:w-64"
            />
          </div>
          <Button>
            <Plus className="size-4" />
            إضافة تصنيف
          </Button>
        </div>
      </div>

      {/* Categories grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {categories.map((category) => {
          const Icon = iconMap[category.icon] ?? LayoutGrid
          return (
            <Card
              key={category.name}
              className="group gap-0 p-5 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div
                  className={`flex size-12 items-center justify-center rounded-xl ${
                    colorMap[category.color] ?? colorMap.blue
                  }`}
                >
                  <Icon className="size-6" />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <MoreHorizontal className="size-5" />
                  <span className="sr-only">خيارات التصنيف</span>
                </Button>
              </div>

              <h3 className="mt-4 text-base font-bold text-foreground">
                {category.name}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {category.description}
              </p>

              <div className="mt-4 flex items-center gap-4 border-t border-border pt-4">
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <BookOpen className="size-4 text-primary" />
                  <span className="font-semibold text-foreground">
                    {category.courses}
                  </span>
                  كورس
                </span>
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Users className="size-4 text-primary" />
                  <span className="font-semibold text-foreground">
                    {category.students}
                  </span>
                  طالب
                </span>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm font-bold text-foreground">
                  {category.revenue}
                </span>
                <button
                  type="button"
                  className="flex items-center gap-1 text-xs font-semibold text-primary transition-opacity hover:underline"
                >
                  عرض الكورسات
                  <ChevronLeft className="size-3.5" />
                </button>
              </div>
            </Card>
          )
        })}
      </div>
    </>
  )
}

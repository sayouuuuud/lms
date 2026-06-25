import { Layers, BookOpen, Users, CheckCircle2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { categoryRecords } from '@/lib/categories-data'

export function CategoriesStats() {
  const totalCategories = categoryRecords.length
  const activeCategories = categoryRecords.filter((c) => c.status === 'مفعّل').length
  const totalCourses = categoryRecords.reduce((sum, c) => sum + c.courses, 0)
  const totalStudents = categoryRecords.reduce((sum, c) => sum + c.students, 0)

  const stats = [
    {
      label: 'إجمالي التصنيفات',
      value: totalCategories.toLocaleString('en-US'),
      icon: Layers,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: 'تصنيفات مفعّلة',
      value: activeCategories.toLocaleString('en-US'),
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    },
    {
      label: 'إجمالي الكورسات',
      value: totalCourses.toLocaleString('en-US'),
      icon: BookOpen,
      color: 'text-amber-600',
      bg: 'bg-amber-50 dark:bg-amber-500/10',
    },
    {
      label: 'إجمالي الطلاب',
      value: totalStudents.toLocaleString('en-US'),
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-500/10',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="gap-0 p-5 transition-shadow hover:shadow-md">
          <div className="flex items-start justify-between">
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <div
              className={cn(
                'flex size-10 items-center justify-center rounded-xl',
                stat.bg,
              )}
            >
              <stat.icon className={cn('size-5', stat.color)} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-foreground">{stat.value}</span>
          </div>
        </Card>
      ))}
    </div>
  )
}

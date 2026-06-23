'use client'

import { useMemo, useState } from 'react'
import { Search, BookOpen, Users, MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useCategories } from './categories-context'

const statusStyles: Record<string, string> = {
  'مفعّل': 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400',
  'متوقف': 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400',
}

export function CategoriesGrid() {
  const { categories, openEdit, requestDelete } = useCategories()
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim()
    if (!q) return categories
    return categories.filter(
      (c) => c.name.includes(q) || c.description.includes(q),
    )
  }, [query, categories])

  return (
    <Card className="gap-0 p-5">
      {/* Toolbar */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث عن تصنيف..."
          className="pr-9"
        />
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center text-sm text-muted-foreground">
          لا توجد تصنيفات مطابقة لبحثك
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((category) => (
            <div
              key={category.id}
              className="group flex flex-col rounded-2xl border border-border bg-card p-5 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div
                  className={cn(
                    'flex size-12 items-center justify-center rounded-xl',
                    category.bg,
                  )}
                >
                  <category.icon className={cn('size-6', category.color)} />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-foreground"
                  onClick={() => openEdit(category)}
                >
                  <MoreVertical className="size-4" />
                  <span className="sr-only">خيارات التصنيف</span>
                </Button>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <h3 className="text-base font-bold text-foreground">{category.name}</h3>
                <Badge
                  variant="outline"
                  className={cn('font-medium', statusStyles[category.status])}
                >
                  {category.status}
                </Badge>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {category.description}
              </p>

              <div className="mt-4 flex items-center gap-4 border-t border-border pt-4 text-sm">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <BookOpen className="size-4" />
                  <span className="font-medium text-foreground">{category.courses}</span>
                  كورس
                </span>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Users className="size-4" />
                  <span className="font-medium text-foreground">
                    {category.students.toLocaleString('en-US')}
                  </span>
                  طالب
                </span>
              </div>

              <div className="mt-4 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 flex-1"
                  onClick={() => openEdit(category)}
                >
                  <Pencil className="size-4" />
                  تعديل
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-500/30 dark:hover:bg-rose-500/10"
                  onClick={() => requestDelete(category)}
                >
                  <Trash2 className="size-4" />
                  <span className="sr-only">حذف التصنيف</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

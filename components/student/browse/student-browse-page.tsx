'use client'

import { useMemo, useState } from 'react'
import {
  BookOpen,
  Check,
  ChevronDown,
  Plus,
  PlayCircle,
  Search,
  ShoppingCart,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCart } from '@/components/cart/cart-provider'
import type { Stage } from '@/lib/landing-data'

function formatEGP(value: number) {
  return new Intl.NumberFormat('ar-EG').format(value)
}

type FlatLecture = {
  dbId?: string
  title: string
  description: string
  price: number
  oldPrice?: number
  badge?: string
  lessonsCount: number
  stageTitle: string
  branchTitle: string
}

export function StudentBrowsePage({ stages = [] }: { stages?: Stage[] }) {
  const { add, inCart, setOpen, count } = useCart()
  const [query, setQuery] = useState('')
  const [stageFilter, setStageFilter] = useState<string>('all')

  // Flatten the curriculum tree into a searchable list of lectures.
  const lectures = useMemo<FlatLecture[]>(() => {
    const out: FlatLecture[] = []
    for (const stage of stages) {
      for (const branch of stage.branches) {
        for (const lec of branch.lectures) {
          out.push({
            dbId: lec.dbId,
            title: lec.title,
            description: lec.description,
            price: lec.price,
            oldPrice: lec.oldPrice,
            badge: lec.badge,
            lessonsCount: lec.lessons.length,
            stageTitle: stage.title,
            branchTitle: branch.title,
          })
        }
      }
    }
    return out
  }, [stages])

  const filtered = useMemo(() => {
    const q = query.trim()
    return lectures.filter((l) => {
      if (stageFilter !== 'all' && l.stageTitle !== stageFilter) return false
      if (!q) return true
      return (
        l.title.includes(q) ||
        l.branchTitle.includes(q) ||
        l.stageTitle.includes(q)
      )
    })
  }, [lectures, query, stageFilter])

  const stageNames = useMemo(() => stages.map((s) => s.title), [stages])

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">تصفّح المحاضرات</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            اختار المحاضرات اللي محتاجها وضيفها للسلة، وابعت طلب الاشتراك للأدمن.
          </p>
        </div>
        {count > 0 && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
          >
            <ShoppingCart className="size-4" />
            السلة ({count})
          </button>
        )}
      </div>

      {/* Search + stage filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث عن محاضرة أو فرع..."
            className="h-11 w-full rounded-xl border border-border bg-secondary/50 pr-9 pl-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:bg-background"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <FilterChip
            label="الكل"
            active={stageFilter === 'all'}
            onClick={() => setStageFilter('all')}
          />
          {stageNames.map((name) => (
            <FilterChip
              key={name}
              label={name}
              active={stageFilter === name}
              onClick={() => setStageFilter(name)}
            />
          ))}
        </div>
      </div>

      {/* Lectures grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
          <div className="grid size-14 place-items-center rounded-full bg-muted text-muted-foreground">
            <BookOpen className="size-6" />
          </div>
          <p className="text-sm text-muted-foreground">مفيش محاضرات مطابقة لبحثك.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((lec, i) => {
            const added = lec.dbId ? inCart(lec.dbId) : false
            return (
              <div
                key={(lec.dbId ?? lec.title) + i}
                className="flex flex-col rounded-2xl border border-border bg-card p-5 transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="rounded-lg bg-secondary px-2 py-1 text-[11px] font-semibold text-muted-foreground">
                    {lec.stageTitle}
                  </span>
                  {lec.badge && (
                    <span className="rounded-lg bg-primary/10 px-2 py-1 text-[11px] font-bold text-primary">
                      {lec.badge}
                    </span>
                  )}
                </div>

                <h3 className="mt-3 text-base font-bold text-foreground">{lec.title}</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">{lec.branchTitle}</p>
                {lec.description && (
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                    {lec.description}
                  </p>
                )}

                <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <PlayCircle className="size-3.5" />
                  {lec.lessonsCount} درس
                </div>

                <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-4">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-lg font-extrabold text-foreground">
                      {formatEGP(lec.price)}
                    </span>
                    <span className="text-xs font-bold text-primary">ج.م</span>
                    {lec.oldPrice && (
                      <span className="text-xs text-muted-foreground line-through">
                        {formatEGP(lec.oldPrice)}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={added || !lec.dbId}
                    onClick={() => lec.dbId && add(lec.dbId, lec.title)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition-colors',
                      added
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        : 'bg-primary text-primary-foreground hover:opacity-90',
                    )}
                  >
                    {added ? (
                      <>
                        <Check className="size-4" />
                        في السلة
                      </>
                    ) : (
                      <>
                        <Plus className="size-4" />
                        أضف للسلة
                      </>
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-4 py-2 text-sm font-semibold transition-colors',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-card text-muted-foreground hover:bg-secondary',
      )}
    >
      {label}
    </button>
  )
}

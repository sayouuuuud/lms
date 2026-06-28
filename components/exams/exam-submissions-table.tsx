'use client'

import { useState, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Search } from 'lucide-react'
import type { ExamSubmissionDetail } from '@/app/admin/exams/[id]/actions'
import { cn } from '@/lib/utils'

export function ExamSubmissionsTable({
  submissions,
}: {
  submissions: ExamSubmissionDetail[]
}) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return submissions
    return submissions.filter(
      (s) =>
        s.studentName.toLowerCase().includes(q) ||
        s.studentCode.toLowerCase().includes(q)
    )
  }, [query, submissions])

  if (submissions.length === 0) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        لم يقم أي طالب بتقديم هذا الاختبار حتى الآن.
      </Card>
    )
  }

  return (
    <Card className="gap-0 p-5">
      <div className="mb-5 relative w-full lg:max-w-sm">
        <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث باسم الطالب أو الكود..."
          className="h-11 w-full rounded-xl border border-border bg-secondary/60 pr-10 pl-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:bg-card"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-right text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="px-3 py-3 font-medium">اسم الطالب</th>
              <th className="px-3 py-3 font-medium">كود الطالب</th>
              <th className="px-3 py-3 font-medium">تاريخ التسليم</th>
              <th className="px-3 py-3 font-medium">الدرجة</th>
              <th className="px-3 py-3 font-medium">الحالة</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((sub) => {
              const percentage = (sub.score / sub.total) * 100
              const isPassed = percentage >= 50

              return (
                <tr key={sub.id} className="transition-colors hover:bg-secondary/40">
                  <td className="px-3 py-3 font-medium text-foreground">
                    {sub.studentName}
                  </td>
                  <td className="px-3 py-3 font-mono text-muted-foreground">
                    {sub.studentCode}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-muted-foreground">
                    {sub.submittedAt}
                  </td>
                  <td className="px-3 py-3 font-semibold text-foreground">
                    {sub.score} <span className="text-muted-foreground font-normal">/ {sub.total}</span>
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={cn(
                        'rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                        isPassed
                          ? 'bg-success/10 text-success'
                          : 'bg-destructive/10 text-destructive'
                      )}
                    >
                      {isPassed ? 'ناجح' : 'راسب'}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground">
            لا يوجد طلاب مطابقين للبحث
          </div>
        )}
      </div>
    </Card>
  )
}

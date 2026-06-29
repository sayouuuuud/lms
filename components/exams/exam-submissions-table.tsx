'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, Inbox } from 'lucide-react'
import type { ExamSubmissionDetail } from '@/app/admin/exams/[id]/actions'

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
      <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed">
        <Inbox className="size-8 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">لا توجد إجابات</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          لم يقم أي طالب بتقديم هذا الاختبار حتى الآن. ستظهر إجابات الطلاب هنا فور تقديمها.
        </p>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>إجابات الطلاب</CardTitle>
        <div className="relative w-full max-w-sm">
          <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث باسم الطالب أو الكود..."
            className="pl-4 pr-10"
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead>
              <tr className="border-y bg-muted/50 text-muted-foreground">
                <th className="px-6 py-3 font-medium">اسم الطالب</th>
                <th className="px-6 py-3 font-medium">كود الطالب</th>
                <th className="px-6 py-3 font-medium">تاريخ التسليم</th>
                <th className="px-6 py-3 font-medium">الدرجة</th>
                <th className="px-6 py-3 font-medium">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((sub) => {
                const percentage = (sub.score / sub.total) * 100
                const isPassed = percentage >= 50

                return (
                  <tr 
                    key={sub.id}
                    className="transition-colors hover:bg-muted/50"
                  >
                    <td className="px-6 py-4 font-medium">
                      {sub.studentName}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs text-muted-foreground">
                        {sub.studentCode}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                      {sub.submittedAt}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-baseline gap-1">
                        <span className="font-semibold">{sub.score}</span>
                        <span className="text-muted-foreground text-xs">/ {sub.total}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={isPassed ? 'default' : 'destructive'} className={isPassed ? 'bg-success/15 text-success hover:bg-success/20 shadow-none' : 'shadow-none'}>
                        {isPassed ? 'ناجح' : 'راسب'}
                      </Badge>
                    </td>
                  </tr>
                )
              })}
              
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-muted-foreground">
                    لا توجد نتائج تطابق بحثك.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

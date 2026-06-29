'use client'

import { useState, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Search, Inbox } from 'lucide-react'
import type { ExamSubmissionDetail } from '@/app/admin/exams/[id]/actions'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

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
      <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed bg-secondary/30">
        <div className="rounded-full bg-secondary p-4 mb-4 shadow-inner">
          <Inbox className="size-8 text-muted-foreground opacity-50" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">لا توجد إجابات</h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-sm">
          لم يقم أي طالب بتقديم هذا الاختبار حتى الآن. ستظهر إجابات الطلاب هنا فور تقديمها.
        </p>
      </Card>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="overflow-hidden border-border/60 shadow-sm">
        <div className="p-5 border-b bg-card/50">
          <div className="relative w-full lg:max-w-sm">
            <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث باسم الطالب أو الكود..."
              className="h-11 w-full rounded-xl border border-input bg-background pr-10 pl-4 text-sm text-foreground shadow-sm transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto bg-card">
          <table className="w-full text-right text-sm">
            <thead className="bg-secondary/30">
              <tr className="border-b border-border/80 text-xs text-muted-foreground uppercase tracking-wider">
                <th className="px-5 py-4 font-semibold text-foreground/70">اسم الطالب</th>
                <th className="px-5 py-4 font-semibold text-foreground/70">كود الطالب</th>
                <th className="px-5 py-4 font-semibold text-foreground/70">تاريخ التسليم</th>
                <th className="px-5 py-4 font-semibold text-foreground/70">الدرجة</th>
                <th className="px-5 py-4 font-semibold text-foreground/70">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              <AnimatePresence>
                {filtered.map((sub) => {
                  const percentage = (sub.score / sub.total) * 100
                  const isPassed = percentage >= 50

                  return (
                    <motion.tr 
                      key={sub.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="group transition-colors hover:bg-secondary/40"
                    >
                      <td className="px-5 py-4 font-medium text-foreground">
                        {sub.studentName}
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-mono text-xs bg-secondary px-2.5 py-1 rounded-md text-muted-foreground border border-border/50 group-hover:text-foreground transition-colors">
                          {sub.studentCode}
                        </span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-muted-foreground">
                        {sub.submittedAt}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-baseline gap-1">
                          <span className="font-bold text-base text-foreground">{sub.score}</span>
                          <span className="text-muted-foreground text-xs">/ {sub.total}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={cn(
                            'inline-flex items-center justify-center rounded-full px-2.5 py-1 text-[11px] font-bold shadow-sm tracking-wide',
                            isPassed
                              ? 'bg-success/15 text-success border border-success/20'
                              : 'bg-destructive/15 text-destructive border border-destructive/20'
                          )}
                        >
                          {isPassed ? 'ناجح' : 'راسب'}
                        </span>
                      </td>
                    </motion.tr>
                  )
                })}
              </AnimatePresence>
            </tbody>
          </table>

          {filtered.length === 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-16 flex flex-col items-center justify-center text-center"
            >
              <div className="rounded-full bg-secondary p-4 mb-3 shadow-inner">
                <Search className="size-6 text-muted-foreground opacity-50" />
              </div>
              <p className="text-sm font-semibold text-foreground">لا يوجد نتائج</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
                لم نتمكن من العثور على أي طلاب يطابقون بحثك.
              </p>
            </motion.div>
          )}
        </div>
      </Card>
    </motion.div>
  )
}

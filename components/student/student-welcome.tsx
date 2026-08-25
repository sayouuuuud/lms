'use client'

import Link from 'next/link'
import { Flame, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useStudent } from '@/components/student/student-context'

export function StudentWelcome({
  completionPercent,
  avgGrade,
  streak,
  lessonsThisWeek,
  examsThisWeek,
}: {
  completionPercent: number
  avgGrade: number | null
  streak: number
  lessonsThisWeek: number
  examsThisWeek: number
}) {
  const { profile } = useStudent()

  // Build a natural Arabic summary of what's due this week.
  const parts: string[] = []
  if (lessonsThisWeek > 0) {
    parts.push(`${lessonsThisWeek} ${lessonsThisWeek === 1 ? 'درس' : 'دروس'}`)
  }
  if (examsThisWeek > 0) {
    parts.push(`${examsThisWeek} ${examsThisWeek === 1 ? 'امتحان' : 'امتحانات'}`)
  }
  const summary =
    parts.length > 0
      ? `عندك ${parts.join(' و ')} هذا الأسبوع. واصل تقدمك الرائع، نحن نؤمن بك!`
      : 'لا يوجد مهام هذا الأسبوع. يمكنك استكشاف المحاضرات وبدء رحلة التعلم!'

  return (
    <Card className="overflow-hidden border-none bg-primary text-primary-foreground shadow-md">
      <CardContent className="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between">
        
        {/* Decorative elements - Subtle and not breaking layout */}
        <div className="pointer-events-none absolute -left-20 -top-20 size-64 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 size-64 rounded-full bg-black/10 blur-3xl" />

        <div className="relative z-10 text-right">
          <p className="text-sm text-primary-foreground/80">
            أهلاً بك مجدداً،
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight">{profile.name}</h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-primary-foreground/90">
            {summary}
          </p>
          
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button render={<Link href="/student/courses" />} variant="secondary" className="font-semibold shadow-sm">
              <Play className="size-4 ml-2" />
              تصفح المحاضرات
            </Button>
            
            {streak > 0 && (
              <div className="flex shrink-0 items-center gap-2 rounded-md bg-white/20 px-3 py-2 text-sm font-medium backdrop-blur-md">
                <Flame className="size-4 text-orange-300 drop-shadow-sm" />
                <span>
                  {streak} {streak === 1 ? 'يوم متواصل' : 'أيام متواصلة'}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="relative z-10 flex shrink-0 items-center gap-6 rounded-xl bg-black/15 px-6 py-4 backdrop-blur-sm border border-white/10">
          <div className="text-center">
            <p className="text-3xl font-bold">{completionPercent}%</p>
            <p className="mt-1 text-xs text-primary-foreground/70">نسبة الإنجاز</p>
          </div>
          <div className="h-12 w-px bg-white/20" />
          <div className="text-center">
            <p className="text-3xl font-bold">
              {avgGrade != null ? `${avgGrade}%` : '-'}
            </p>
            <p className="mt-1 text-xs text-primary-foreground/70">متوسط الدرجات</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

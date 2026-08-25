import Image from 'next/image'
import Link from 'next/link'
import { Play, BookOpen } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export function ContinueLearning({ lastWatched }: { lastWatched?: any }) {
  if (!lastWatched) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">أكمل من حيث توقفت</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-full min-h-[120px] flex-col items-center justify-center gap-3 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-secondary">
              <BookOpen className="size-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">لم تبدأ مشاهدة أي دروس بعد</p>
              <p className="mt-1 text-xs text-muted-foreground">تصفح المحاضرات وابدأ رحلة التعلم</p>
            </div>
            <Button render={<Link href="/student/courses" />} variant="secondary" size="sm" className="mt-2">
              تصفح المحاضرات
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">أكمل من حيث توقفت</CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="flex flex-col gap-6 sm:flex-row items-center sm:items-stretch">
          <div className="relative w-full shrink-0 overflow-hidden rounded-lg sm:w-64 aspect-video sm:aspect-auto">
            <Image
              src={lastWatched.image || '/placeholder.svg'}
              alt={lastWatched.lessonTitle}
              fill
              sizes="(max-width: 640px) 100vw, 256px"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/50 transition-colors">
              <div className="flex size-12 items-center justify-center rounded-full bg-white/90 text-primary shadow-lg backdrop-blur-sm">
                <Play className="size-5 ml-1" />
              </div>
            </div>
          </div>

          <div className="flex flex-1 flex-col justify-center w-full">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                {lastWatched.branch || 'درس مسجل'}
              </span>
              <span className="text-xs text-muted-foreground truncate">{lastWatched.lectureTitle}</span>
            </div>
            <h4 className="mt-2 text-xl font-bold text-foreground leading-tight">{lastWatched.lessonTitle}</h4>
            
            <div className="mt-6 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">اكتمل {lastWatched.percent}%</span>
                <span className="text-muted-foreground text-xs">
                  آخر مشاهدة: {new Date(lastWatched.lastViewedAt).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })}
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary/50">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                  style={{ width: `${lastWatched.percent}%` }}
                />
              </div>
            </div>

            <Button render={<Link href={`/student/courses/${lastWatched.lectureId}?lesson=${lastWatched.lessonId}`} />} className="mt-6 w-full sm:w-auto">
              <Play className="size-4 ml-2" />
              استكمال المشاهدة
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

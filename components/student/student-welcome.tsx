import { Flame, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { studentProfile } from '@/lib/student-data'

export function StudentWelcome() {
  return (
    <div className="flex flex-col gap-4 overflow-hidden rounded-2xl bg-sidebar p-6 text-white sm:flex-row sm:items-center sm:justify-between">
      <div className="text-right">
        <p className="text-sm text-white/70">
          أهلاً بعودتك <span aria-hidden="true">👋</span>
        </p>
        <h2 className="mt-1 text-2xl font-bold">{studentProfile.name}</h2>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-white/70">
          لديك 3 دروس و اختبار واحد هذا الأسبوع. استمري في التقدّم لتحافظي على
          سلسلة إنجازاتك!
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button className="bg-white text-sidebar hover:bg-white/90">
            <Play className="size-4" />
            متابعة التعلّم
          </Button>
          <div className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm font-medium">
            <Flame className="size-4 text-amber-400" />
            <span>7 أيام متتالية</span>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-6 rounded-2xl bg-white/5 px-6 py-4">
        <div className="text-center">
          <p className="text-3xl font-bold">68%</p>
          <p className="mt-1 text-xs text-white/60">نسبة الإنجاز</p>
        </div>
        <div className="h-12 w-px bg-white/15" />
        <div className="text-center">
          <p className="text-3xl font-bold">92%</p>
          <p className="mt-1 text-xs text-white/60">متوسط الدرجات</p>
        </div>
      </div>
    </div>
  )
}

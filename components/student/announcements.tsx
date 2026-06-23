import { Megaphone } from 'lucide-react'
import { PanelCard } from '@/components/dashboard/panel-card'
import { announcements } from '@/lib/student-data'

export function Announcements() {
  return (
    <PanelCard title="إعلانات و تنبيهات" action="عرض الكل">
      <ul className="space-y-3">
        {announcements.map((item) => (
          <li key={item.id} className="flex gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Megaphone className="size-4" />
            </div>
            <div className="min-w-0 flex-1 border-b border-border pb-3 last:border-0 last:pb-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">{item.title}</p>
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {item.time}
                </span>
              </div>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                {item.text}
              </p>
              <span className="mt-1 inline-block text-[11px] font-medium text-primary">
                {item.course}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </PanelCard>
  )
}

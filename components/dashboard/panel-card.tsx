import type { ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { Card } from '@/components/ui/card'

export function PanelCard({
  title,
  filter,
  action,
  children,
}: {
  title: string
  filter?: string
  action?: string
  children: ReactNode
}) {
  return (
    <Card className="flex h-full flex-col gap-0 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-bold text-foreground">{title}</h3>
        {filter && (
          <button
            type="button"
            className="flex items-center gap-1 rounded-lg border border-border bg-secondary/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary"
          >
            {filter}
            <ChevronDown className="size-3.5" />
          </button>
        )}
        {action && (
          <button
            type="button"
            className="text-xs font-semibold text-primary hover:underline"
          >
            {action}
          </button>
        )}
      </div>
      <div className="flex min-h-0 flex-1 flex-col justify-center">
        {children}
      </div>
    </Card>
  )
}

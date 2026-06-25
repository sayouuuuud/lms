'use client'

import { CheckCheck, Settings2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

export function NotificationsPageHeader({
  onMarkAllRead,
  unreadCount,
}: {
  onMarkAllRead: () => void
  unreadCount: number
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="text-right">
        <h2 className="text-2xl font-bold text-foreground">الإشعارات</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          متابعة جميع التنبيهات والأنشطة الأخيرة على المنصة
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          className="border-border bg-card text-foreground hover:bg-secondary"
          onClick={onMarkAllRead}
          disabled={unreadCount === 0}
        >
          <CheckCheck className="size-4" />
          تعليم الكل كمقروء
        </Button>
        <Button
          onClick={() => toast.info('سيتم فتح إعدادات الإشعارات قريبًا')}
        >
          <Settings2 className="size-4" />
          إعدادات الإشعارات
        </Button>
      </div>
    </div>
  )
}

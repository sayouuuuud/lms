import { CheckCheck, PenSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function MessagesPageHeader() {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="text-right">
        <h2 className="text-2xl font-bold text-foreground">الرسائل</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          تواصل مع الطلاب وردّ على استفساراتهم في مكان واحد
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline">
          <CheckCheck className="size-4" />
          تعليم الكل كمقروء
        </Button>
        <Button>
          <PenSquare className="size-4" />
          رسالة جديدة
        </Button>
      </div>
    </div>
  )
}

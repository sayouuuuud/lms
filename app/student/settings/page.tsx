import { StudentLayout } from '@/components/student/student-layout'
import { StudentSettingsPanel } from '@/components/student/settings/student-settings-panel'

export default function Page() {
  return (
    <StudentLayout>
      <div className="space-y-6">
        <div className="text-right">
          <h2 className="text-2xl font-bold text-foreground">الإعدادات</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            إدارة معلومات حسابك وتفضيلاتك والإشعارات والأمان
          </p>
        </div>
        <StudentSettingsPanel />
      </div>
    </StudentLayout>
  )
}

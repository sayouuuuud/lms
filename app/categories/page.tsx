import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { CategoriesPageHeader } from '@/components/categories/categories-page-header'
import { CategoriesStats } from '@/components/categories/categories-stats'
import { CategoriesGrid } from '@/components/categories/categories-grid'

export default function CategoriesPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <CategoriesPageHeader />
        <CategoriesStats />
        <CategoriesGrid />
      </div>
    </DashboardLayout>
  )
}

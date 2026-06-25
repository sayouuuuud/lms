import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { CategoriesProvider } from '@/components/categories/categories-context'
import { CategoriesPageHeader } from '@/components/categories/categories-page-header'
import { CategoriesStats } from '@/components/categories/categories-stats'
import { CategoriesGrid } from '@/components/categories/categories-grid'
import { CategoryFormModal } from '@/components/categories/category-form-modal'

export default function CategoriesPage() {
  return (
    <DashboardLayout>
      <CategoriesProvider>
        <div className="space-y-6">
          <CategoriesPageHeader />
          <CategoriesStats />
          <CategoriesGrid />
        </div>
        <CategoryFormModal />
      </CategoriesProvider>
    </DashboardLayout>
  )
}

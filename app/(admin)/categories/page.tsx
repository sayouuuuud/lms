import { CategoriesProvider } from '@/components/categories/categories-context'
import { CategoriesPageHeader } from '@/components/categories/categories-page-header'
import { CategoriesStats } from '@/components/categories/categories-stats'
import { CategoriesGrid } from '@/components/categories/categories-grid'
import { CategoryFormModal } from '@/components/categories/category-form-modal'
import { getCategories } from './actions'

export default async function CategoriesPage() {
  const categories = await getCategories()

  return (
    <>
      <CategoriesProvider initialCategories={categories}>
        <div className="space-y-6">
          <CategoriesPageHeader />
          <CategoriesStats />
          <CategoriesGrid />
        </div>
        <CategoryFormModal />
      </CategoriesProvider>
    </>
  )
}

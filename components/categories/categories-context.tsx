'use client'

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { Layers } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import {
  type CategoryRecord,
  type CategoryStatus,
} from '@/lib/categories-data'
import { createCategory, updateCategory, deleteCategory } from '@/app/categories/actions'

type CategoryFormValues = {
  name: string
  description: string
  status: CategoryStatus
}

type CategoriesContextValue = {
  categories: CategoryRecord[]
  openCreate: () => void
  openEdit: (category: CategoryRecord) => void
  requestDelete: (category: CategoryRecord) => void
  // internal modal state
  formOpen: boolean
  editing: CategoryRecord | null
  closeForm: () => void
  submitForm: (values: CategoryFormValues) => void
  deleting: CategoryRecord | null
  closeDelete: () => void
  confirmDelete: () => void
}

const CategoriesContext = createContext<CategoriesContextValue | null>(null)

export function useCategories() {
  const ctx = useContext(CategoriesContext)
  if (!ctx) throw new Error('useCategories must be used within CategoriesProvider')
  return ctx
}

export function CategoriesProvider({ 
  children,
  initialCategories 
}: { 
  children: ReactNode
  initialCategories: CategoryRecord[]
}) {
  const router = useRouter()
  const [categories, setCategories] = useState<CategoryRecord[]>(initialCategories)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<CategoryRecord | null>(null)
  const [deleting, setDeleting] = useState<CategoryRecord | null>(null)

  const value = useMemo<CategoriesContextValue>(
    () => ({
      categories,
      openCreate: () => {
        setEditing(null)
        setFormOpen(true)
      },
      openEdit: (category) => {
        setEditing(category)
        setFormOpen(true)
      },
      requestDelete: (category) => setDeleting(category),
      formOpen,
      editing,
      closeForm: () => setFormOpen(false),
      submitForm: async (values) => {
        if (editing) {
          const original = [...categories]
          setCategories((prev) =>
            prev.map((c) => (c.id === editing.id ? { ...c, ...values } : c)),
          )
          setFormOpen(false)
          setEditing(null)
          
          const res = await updateCategory(editing.id, values)
          if (res.error) {
            toast.error(res.error)
            setCategories(original)
          } else {
            toast.success('تم تحديث التصنيف بنجاح')
            router.refresh()
          }
        } else {
          setFormOpen(false)
          const res = await createCategory(values)
          if (res.error) {
            toast.error(res.error)
          } else {
            toast.success('تم إضافة التصنيف بنجاح')
            router.refresh()
          }
        }
      },
      deleting,
      closeDelete: () => setDeleting(null),
      confirmDelete: async () => {
        if (deleting) {
          const original = [...categories]
          setCategories((prev) => prev.filter((c) => c.id !== deleting.id))
          const id = deleting.id
          setDeleting(null)
          
          const res = await deleteCategory(id)
          if (res.error) {
            toast.error(res.error)
            setCategories(original)
          } else {
            toast.success('تم حذف التصنيف')
            router.refresh()
          }
        } else {
          setDeleting(null)
        }
      },
    }),
    [categories, formOpen, editing, deleting],
  )

  return (
    <CategoriesContext.Provider value={value}>
      {children}
    </CategoriesContext.Provider>
  )
}

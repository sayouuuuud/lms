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
import {
  categoryRecords,
  type CategoryRecord,
  type CategoryStatus,
} from '@/lib/categories-data'

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

export function CategoriesProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<CategoryRecord[]>(categoryRecords)
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
      submitForm: (values) => {
        if (editing) {
          setCategories((prev) =>
            prev.map((c) => (c.id === editing.id ? { ...c, ...values } : c)),
          )
          toast.success('تم تحديث التصنيف بنجاح')
        } else {
          const newCategory: CategoryRecord = {
            id: `CAT-${String(categories.length + 1).padStart(2, '0')}`,
            name: values.name,
            description: values.description,
            status: values.status,
            courses: 0,
            students: 0,
            icon: Layers,
            color: 'text-primary',
            bg: 'bg-primary/10',
          }
          setCategories((prev) => [newCategory, ...prev])
          toast.success('تم إضافة التصنيف بنجاح')
        }
        setFormOpen(false)
        setEditing(null)
      },
      deleting,
      closeDelete: () => setDeleting(null),
      confirmDelete: () => {
        if (deleting) {
          setCategories((prev) => prev.filter((c) => c.id !== deleting.id))
          toast.success('تم حذف التصنيف')
        }
        setDeleting(null)
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

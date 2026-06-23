'use client'

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { toast } from 'sonner'
import {
  couponRecords,
  type CouponRecord,
  type CouponStatus,
  type CouponType,
} from '@/lib/coupons-data'

export type CouponFormValues = {
  code: string
  description: string
  type: CouponType
  value: number
  limit: number
  startDate: string
  endDate: string
  status: CouponStatus
}

type CouponsContextValue = {
  coupons: CouponRecord[]
  openCreate: () => void
  openEdit: (coupon: CouponRecord) => void
  requestDelete: (coupon: CouponRecord) => void
  formOpen: boolean
  editing: CouponRecord | null
  closeForm: () => void
  submitForm: (values: CouponFormValues) => void
  deleting: CouponRecord | null
  closeDelete: () => void
  confirmDelete: () => void
}

const CouponsContext = createContext<CouponsContextValue | null>(null)

export function useCoupons() {
  const ctx = useContext(CouponsContext)
  if (!ctx) throw new Error('useCoupons must be used within CouponsProvider')
  return ctx
}

export function CouponsProvider({ children }: { children: ReactNode }) {
  const [coupons, setCoupons] = useState<CouponRecord[]>(couponRecords)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<CouponRecord | null>(null)
  const [deleting, setDeleting] = useState<CouponRecord | null>(null)

  const value = useMemo<CouponsContextValue>(
    () => ({
      coupons,
      openCreate: () => {
        setEditing(null)
        setFormOpen(true)
      },
      openEdit: (coupon) => {
        setEditing(coupon)
        setFormOpen(true)
      },
      requestDelete: (coupon) => setDeleting(coupon),
      formOpen,
      editing,
      closeForm: () => setFormOpen(false),
      submitForm: (values) => {
        if (editing) {
          setCoupons((prev) =>
            prev.map((c) => (c.id === editing.id ? { ...c, ...values } : c)),
          )
          toast.success('تم تحديث الكوبون بنجاح')
        } else {
          const newCoupon: CouponRecord = {
            id: `CPN-${String(coupons.length + 1).padStart(2, '0')}`,
            used: 0,
            ...values,
          }
          setCoupons((prev) => [newCoupon, ...prev])
          toast.success('تم إنشاء الكوبون بنجاح')
        }
        setFormOpen(false)
        setEditing(null)
      },
      deleting,
      closeDelete: () => setDeleting(null),
      confirmDelete: () => {
        if (deleting) {
          setCoupons((prev) => prev.filter((c) => c.id !== deleting.id))
          toast.success('تم حذف الكوبون')
        }
        setDeleting(null)
      },
    }),
    [coupons, formOpen, editing, deleting],
  )

  return <CouponsContext.Provider value={value}>{children}</CouponsContext.Provider>
}

'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth-guard'
import { revalidatePath } from 'next/cache'
import type { CouponRecord, CouponStatus, CouponType } from '@/lib/coupons-data'

export async function getCoupons(): Promise<CouponRecord[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .order('display_code', { ascending: true })

  if (error || !data) return []

  return data.map((row) => ({
    id: row.display_code,
    code: row.code,
    description: row.description,
    type: row.type as CouponType,
    value: row.value,
    used: row.used,
    limit: row.limit,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status as CouponStatus,
  }))
}

export async function createCoupon(values: {
  code: string
  description: string
  type: string
  value: number
  limit: number
  startDate: string
  endDate: string
  status: string
}) {
  const supabase = await createClient()
  if (!(await requireAdmin(supabase))) {
    return { error: 'غير مسموح. لازم تكون أدمن.' }
  }

  const { data: latest } = await supabase
    .from('coupons')
    .select('display_code')
    .order('display_code', { ascending: false })
    .limit(1)
    .single()

  let nextNum = 1
  if (latest && latest.display_code.startsWith('CPN-')) {
    const num = parseInt(latest.display_code.replace('CPN-', ''), 10)
    if (!isNaN(num)) nextNum = num + 1
  }
  const displayCode = `CPN-${String(nextNum).padStart(2, '0')}`

  const { error } = await supabase.from('coupons').insert({
    code: values.code,
    display_code: displayCode,
    description: values.description,
    type: values.type,
    value: values.value,
    "limit": values.limit,
    start_date: values.startDate,
    end_date: values.endDate,
    status: values.status,
    used: 0,
  })

  if (error) {
    if (error.code === '23505') {
      return { error: 'كود الكوبون موجود مسبقاً.' }
    }
    return { error: error.message }
  }
  
  revalidatePath('/coupons')
  return { success: true }
}

export async function updateCoupon(
  id: string,
  values: {
    code: string
    description: string
    type: string
    value: number
    limit: number
    startDate: string
    endDate: string
    status: string
  },
) {
  const supabase = await createClient()
  if (!(await requireAdmin(supabase))) {
    return { error: 'غير مسموح. لازم تكون أدمن.' }
  }

  const { error } = await supabase
    .from('coupons')
    .update({
      code: values.code,
      description: values.description,
      type: values.type,
      value: values.value,
      "limit": values.limit,
      start_date: values.startDate,
      end_date: values.endDate,
      status: values.status,
    })
    .eq('display_code', id)

  if (error) {
    if (error.code === '23505') {
      return { error: 'كود الكوبون موجود مسبقاً.' }
    }
    return { error: error.message }
  }
  
  revalidatePath('/coupons')
  return { success: true }
}

export async function deleteCoupon(id: string) {
  const supabase = await createClient()
  if (!(await requireAdmin(supabase))) {
    return { error: 'غير مسموح. لازم تكون أدمن.' }
  }

  const { error } = await supabase.from('coupons').delete().eq('display_code', id)
  if (error) return { error: error.message }
  revalidatePath('/coupons')
  return { success: true }
}

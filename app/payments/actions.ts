'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth-guard'
import { revalidatePath } from 'next/cache'
import type { PaymentRecord, PaymentMethod, PaymentStatus } from '@/lib/payments-data'

export async function getPayments(): Promise<PaymentRecord[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .order('created_at', { ascending: false })

  if (error || !data) return []

  return data.map((row) => ({
    id: row.code,
    studentName: row.student_name,
    studentEmail: row.student_email,
    studentPhone: row.student_phone,
    course: row.course,
    amount: row.amount,
    method: row.method as PaymentMethod,
    receiptUrl: row.receipt_url || '',
    reference: row.reference,
    submittedAt: row.submitted_at,
    status: row.status as PaymentStatus,
  }))
}

export async function updatePaymentStatus(id: string, status: string) {
  const supabase = await createClient()
  if (!(await requireAdmin(supabase))) {
    return { error: 'غير مسموح. لازم تكون أدمن.' }
  }

  const { error } = await supabase
    .from('payments')
    .update({ status })
    .eq('code', id)

  if (error) return { error: error.message }
  revalidatePath('/payments')
  return { success: true }
}

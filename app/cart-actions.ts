'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type CartItem = {
  lectureId: string
  title: string
  branchTitle: string
  stageTitle: string
  price: number
}

// Returns the signed-in student's cart (joined with lecture/branch/stage info).
// Returns null when the visitor is not logged in.
export async function getCartItems(): Promise<CartItem[] | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('cart_items')
    .select(
      `lecture_id,
       lectures:lecture_id (
         title, price,
         branches:branch_id ( title, stages:stage_id ( title ) )
       )`,
    )
    .eq('student_id', user.id)
    .order('created_at', { ascending: true })

  if (error || !data) return []

  return data.map((row: any) => ({
    lectureId: row.lecture_id,
    title: row.lectures?.title ?? '',
    branchTitle: row.lectures?.branches?.title ?? '',
    stageTitle: row.lectures?.branches?.stages?.title ?? '',
    price: Number(row.lectures?.price ?? 0),
  }))
}

export async function addToCart(lectureId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'unauthenticated' as const }

  const { error } = await supabase
    .from('cart_items')
    .insert({ student_id: user.id, lecture_id: lectureId })

  // ignore unique-violation (already in cart)
  if (error && error.code !== '23505') return { error: error.message }
  revalidatePath('/', 'layout')
  return { success: true }
}

export async function removeFromCart(lectureId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'unauthenticated' as const }

  const { error } = await supabase
    .from('cart_items')
    .delete()
    .eq('student_id', user.id)
    .eq('lecture_id', lectureId)

  if (error) return { error: error.message }
  revalidatePath('/', 'layout')
  return { success: true }
}

export async function getCheckoutDefaults(): Promise<{ name: string; phone: string; email: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { name: '', phone: '', email: '' }

  const { data } = await supabase
    .from('profiles')
    .select('full_name, phone, email')
    .eq('id', user.id)
    .single()

  return {
    name: data?.full_name ?? '',
    phone: data?.phone ?? '',
    email: data?.email ?? user.email ?? '',
  }
}

function generateOrderCode() {
  const year = new Date().getFullYear()
  const rand = Math.floor(1000 + Math.random() * 9000)
  return `ORD-${year}-${rand}`
}

export async function createOrder(input: {
  name: string
  phone: string
  method: string
  reference?: string
  note?: string
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'unauthenticated' as const }

  const items = await getCartItems()
  if (!items || items.length === 0) return { error: 'السلة فارغة.' }

  const total = items.reduce((sum, i) => sum + i.price, 0)
  const code = generateOrderCode()

  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .insert({
      code,
      student_id: user.id,
      student_name: input.name,
      student_email: user.email ?? '',
      student_phone: input.phone,
      method: input.method,
      reference: input.reference ?? '',
      note: input.note ?? '',
      total,
      status: 'pending',
    })
    .select('id, code')
    .single()

  if (orderErr || !order) return { error: orderErr?.message ?? 'تعذّر إنشاء الطلب.' }

  const { error: itemsErr } = await supabase.from('order_items').insert(
    items.map((i) => ({
      order_id: order.id,
      lecture_id: i.lectureId,
      lecture_title: i.title,
      branch_title: i.branchTitle,
      stage_title: i.stageTitle,
      price: i.price,
    })),
  )
  if (itemsErr) return { error: itemsErr.message }

  // clear the cart after a successful order
  await supabase.from('cart_items').delete().eq('student_id', user.id)

  revalidatePath('/', 'layout')
  return { success: true, code: order.code }
}

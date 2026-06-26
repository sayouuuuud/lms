'use client'

import Link from 'next/link'
import { ArrowRight, Loader2, ShoppingCart } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useCart } from '@/components/cart/cart-provider'

/**
 * "Subscribe to the whole stage/branch" button. For logged-in students it adds
 * every lecture id to the cart and opens it; for visitors it links to register.
 */
export function SubscribeButton({
  lectureIds,
  label,
  className,
}: {
  lectureIds: string[]
  label: string
  className?: string
}) {
  const { add, loggedIn, setOpen, items } = useCart()
  const [busy, setBusy] = useState(false)

  if (!loggedIn) {
    return (
      <Link href="/auth?mode=register" className={className}>
        {label}
        <ArrowRight className="size-5 rotate-180" />
      </Link>
    )
  }

  const handleClick = async () => {
    const inCartIds = new Set(items.map((i) => i.lectureId))
    const toAdd = lectureIds.filter((id) => id && !inCartIds.has(id))
    if (toAdd.length === 0 && lectureIds.length > 0) {
      setOpen(true)
      toast.info('كل المحاضرات موجودة في السلة بالفعل')
      return
    }
    setBusy(true)
    for (const id of toAdd) {
      // add() is idempotent server-side (ignores duplicates)
      await add(id)
    }
    setBusy(false)
    setOpen(true)
    toast.success('تمت إضافة المحاضرات للسلة')
  }

  return (
    <button type="button" onClick={handleClick} disabled={busy} className={className}>
      {busy ? <Loader2 className="size-5 animate-spin" /> : <ShoppingCart className="size-5" />}
      {label}
    </button>
  )
}

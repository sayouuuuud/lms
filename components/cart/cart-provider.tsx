'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  getCartItems,
  addToCart as addToCartAction,
  removeFromCart as removeFromCartAction,
  type CartItem,
} from '@/app/cart-actions'

type CartContextValue = {
  items: CartItem[]
  count: number
  total: number
  loggedIn: boolean
  open: boolean
  setOpen: (open: boolean) => void
  inCart: (lectureId: string) => boolean
  add: (lectureId: string, title?: string) => Promise<void>
  remove: (lectureId: string) => Promise<void>
  refresh: () => Promise<void>
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [items, setItems] = useState<CartItem[]>([])
  const [loggedIn, setLoggedIn] = useState(false)
  const [open, setOpen] = useState(false)

  const refresh = useCallback(async () => {
    const data = await getCartItems()
    if (data === null) {
      setLoggedIn(false)
      setItems([])
    } else {
      setLoggedIn(true)
      setItems(data)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const inCart = useCallback(
    (lectureId: string) => items.some((i) => i.lectureId === lectureId),
    [items],
  )

  const add = useCallback(
    async (lectureId: string, title?: string) => {
      const res = await addToCartAction(lectureId)
      if (res?.error === 'unauthenticated') {
        toast.error('سجّل دخولك الأول عشان تضيف للسلة')
        router.push('/auth?mode=register')
        return
      }
      if (res?.error) {
        toast.error(res.error)
        return
      }
      await refresh()
      toast.success(title ? `تمت إضافة "${title}" للسلة` : 'تمت الإضافة للسلة')
    },
    [refresh, router],
  )

  const remove = useCallback(
    async (lectureId: string) => {
      // optimistic
      setItems((prev) => prev.filter((i) => i.lectureId !== lectureId))
      const res = await removeFromCartAction(lectureId)
      if (res?.error) {
        toast.error(res.error)
        await refresh()
      }
    },
    [refresh],
  )

  const total = items.reduce((sum, i) => sum + i.price, 0)

  return (
    <CartContext.Provider
      value={{
        items,
        count: items.length,
        total,
        loggedIn,
        open,
        setOpen,
        inCart,
        add,
        remove,
        refresh,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}

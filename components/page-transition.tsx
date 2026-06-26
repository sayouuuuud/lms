'use client'

import { motion } from 'framer-motion'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

// Animates only the page content on navigation. Kept separate from the
// dashboard/student shells (sidebar + header) so those stay mounted and
// never flicker when switching pages.
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}

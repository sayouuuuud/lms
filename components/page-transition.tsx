'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

// Lightweight page-content transition: a short CSS fade keyed on the pathname.
// No animation-library runtime per navigation, so switching pages feels snappy.
// Kept separate from the dashboard/student shells (sidebar + header) so those
// stay mounted and never flicker.
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  return (
    <div key={pathname} className="ns-page-fade">
      {children}
    </div>
  )
}

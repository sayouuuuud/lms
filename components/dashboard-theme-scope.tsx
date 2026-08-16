'use client'

import { useEffect } from 'react'

/**
 * Both dashboards (admin + student portal) use the `.theme-dashboard` palette
 * instead of the public site palette that lives on `:root`. The layout wrappers
 * carry the class for the page itself, but portalled UI (modals, confirm
 * dialogs, dropdowns, toasts) renders into <body>, which sits outside that
 * wrapper — so the scope has to be mirrored on <body> while a dashboard route
 * is mounted. Without this, every modal falls back to the public brand colours.
 */
export function DashboardThemeScope() {
  useEffect(() => {
    document.body.classList.add('theme-dashboard')
    return () => document.body.classList.remove('theme-dashboard')
  }, [])

  return null
}

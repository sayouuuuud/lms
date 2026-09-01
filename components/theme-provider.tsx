'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

type ThemeMode = 'dark' | 'light' | 'system'

type ThemeContextValue = {
  isDark: boolean
  toggleTheme: () => void
  setTheme: (theme: ThemeMode) => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    // Sync initial state from document class set by <head> script
    const initialDark = document.documentElement.classList.contains('dark')
    setIsDark(initialDark)

    // Listen for system theme changes if no explicit user preference is stored
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleMediaChange = (e: MediaQueryListEvent) => {
      const stored = localStorage.getItem('theme')
      if (!stored || stored === 'system') {
        document.documentElement.classList.toggle('dark', e.matches)
        setIsDark(e.matches)
      }
    }

    // Listen for storage events to sync theme across multiple tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'theme') {
        const newTheme = e.newValue
        const isDarkNow =
          newTheme === 'dark' ||
          ((!newTheme || newTheme === 'system') &&
            window.matchMedia('(prefers-color-scheme: dark)').matches)
        document.documentElement.classList.toggle('dark', isDarkNow)
        setIsDark(isDarkNow)
      }
    }

    mediaQuery.addEventListener('change', handleMediaChange)
    window.addEventListener('storage', handleStorageChange)
    return () => {
      mediaQuery.removeEventListener('change', handleMediaChange)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev
      document.documentElement.classList.toggle('dark', next)
      try {
        localStorage.setItem('theme', next ? 'dark' : 'light')
      } catch {
        // ignore quota / private mode storage error
      }
      return next
    })
  }

  const setTheme = (theme: ThemeMode) => {
    if (theme === 'system') {
      try {
        localStorage.removeItem('theme')
      } catch {}
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      document.documentElement.classList.toggle('dark', prefersDark)
      setIsDark(prefersDark)
    } else {
      const darkActive = theme === 'dark'
      try {
        localStorage.setItem('theme', theme)
      } catch {}
      document.documentElement.classList.toggle('dark', darkActive)
      setIsDark(darkActive)
    }
  }

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return ctx
}


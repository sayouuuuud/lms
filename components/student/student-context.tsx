'use client'

import { createContext, useContext, ReactNode } from 'react'

type StudentData = {
  profile: any
  enrolledCourses?: any[]
  schedule?: any[]
  grades?: any[]
  announcements?: any[]
  activity?: any[]
}

const StudentContext = createContext<StudentData | null>(null)

export function StudentProvider({ children, data }: { children: ReactNode, data: StudentData }) {
  return (
    <StudentContext.Provider value={data}>
      {children}
    </StudentContext.Provider>
  )
}

export function useStudent() {
  const ctx = useContext(StudentContext)
  if (!ctx) throw new Error('useStudent must be used within StudentProvider')
  return ctx
}

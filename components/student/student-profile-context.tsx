'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { StudentProfile } from '@/app/student/actions'

// Fallback profile used only when there is no linked student row, so the
// portal never crashes on missing data.
const fallbackProfile: StudentProfile = {
  name: 'طالب',
  email: '',
  initials: 'ط',
  level: 'طالب',
  id: '',
  gender: 'ذكر',
}

const StudentProfileContext = createContext<StudentProfile>(fallbackProfile)

export function StudentProfileProvider({
  profile,
  children,
}: {
  profile: StudentProfile | null
  children: ReactNode
}) {
  return (
    <StudentProfileContext.Provider value={profile ?? fallbackProfile}>
      {children}
    </StudentProfileContext.Provider>
  )
}

// Read the current student's real profile from context.
export function useStudentProfile(): StudentProfile {
  return useContext(StudentProfileContext)
}

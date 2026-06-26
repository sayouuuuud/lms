import type { ReactNode } from 'react'
import { getCurrentStudentProfile } from './actions'
import { StudentProfileProvider } from '@/components/student/student-profile-context'

export default async function StudentRootLayout({
  children,
}: {
  children: ReactNode
}) {
  const profile = await getCurrentStudentProfile()

  return (
    <StudentProfileProvider profile={profile}>
      {children}
    </StudentProfileProvider>
  )
}

import { notFound } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { StudentProfileView } from '@/components/students/profile/student-profile'
import { getStudentProfile, getAllStudentIds } from '@/lib/student-profile-data'

export function generateStaticParams() {
  return getAllStudentIds().map((id) => ({ id }))
}

export default async function StudentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const profile = getStudentProfile(id)

  if (!profile) {
    notFound()
  }

  return (
    <DashboardLayout>
      <StudentProfileView profile={profile} />
    </DashboardLayout>
  )
}

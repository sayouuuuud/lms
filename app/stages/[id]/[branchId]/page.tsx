import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { stages, getStage, getBranch } from '@/lib/landing-data'
import { LandingNavbar } from '@/components/landing/landing-navbar'
import { SiteFooter } from '@/components/landing/site-footer'
import { BranchDetail } from '@/components/stages/branch-detail'

export function generateStaticParams() {
  return stages.flatMap((stage) =>
    stage.branches.map((branch) => ({ id: stage.id, branchId: branch.id })),
  )
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; branchId: string }>
}): Promise<Metadata> {
  const { id, branchId } = await params
  const branch = getBranch(id, branchId)
  if (!branch) return { title: 'الفرع غير موجود' }
  return {
    title: `${branch.title} — منصة الأستاذ عبد السلام`,
    description: branch.description,
  }
}

export default async function BranchPage({
  params,
}: {
  params: Promise<{ id: string; branchId: string }>
}) {
  const { id, branchId } = await params
  const stage = getStage(id)
  const branch = getBranch(id, branchId)
  if (!stage || !branch) notFound()

  return (
    <>
      <LandingNavbar />
      <BranchDetail stage={stage} branch={branch} />
      <SiteFooter />
    </>
  )
}

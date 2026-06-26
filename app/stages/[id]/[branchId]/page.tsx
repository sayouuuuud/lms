import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getBranchBySlug } from '@/lib/curriculum'
import { LandingNavbar } from '@/components/landing/landing-navbar'
import { SiteFooter } from '@/components/landing/site-footer'
import { BranchDetail } from '@/components/stages/branch-detail'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; branchId: string }>
}): Promise<Metadata> {
  const { id, branchId } = await params
  const result = await getBranchBySlug(id, branchId)
  if (!result) return { title: 'الفرع غير موجود' }
  return {
    title: `${result.branch.title} — منصة الأستاذ عبد السلام`,
    description: result.branch.description,
  }
}

export default async function BranchPage({
  params,
}: {
  params: Promise<{ id: string; branchId: string }>
}) {
  const { id, branchId } = await params
  const result = await getBranchBySlug(id, branchId)
  if (!result) notFound()

  return (
    <>
      <LandingNavbar />
      <BranchDetail stage={result.stage} branch={result.branch} />
      <SiteFooter />
    </>
  )
}

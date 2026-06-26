import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getStageBySlug } from '@/lib/curriculum'
import { LandingNavbar } from '@/components/landing/landing-navbar'
import { SiteFooter } from '@/components/landing/site-footer'
import { StageDetail } from '@/components/stages/stage-detail'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const stage = await getStageBySlug(id)
  if (!stage) return { title: 'المرحلة غير موجودة' }
  return {
    title: `${stage.title} — منصة الأستاذ عبد السلام`,
    description: stage.subtitle,
  }
}

export default async function StagePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const stage = await getStageBySlug(id)
  if (!stage) notFound()

  return (
    <>
      <LandingNavbar />
      <StageDetail stage={stage} />
      <SiteFooter />
    </>
  )
}

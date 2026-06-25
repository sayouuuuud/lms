import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { stages } from '@/lib/landing-data'
import { LandingNavbar } from '@/components/landing/landing-navbar'
import { SiteFooter } from '@/components/landing/site-footer'
import { StageDetail } from '@/components/stages/stage-detail'

export function generateStaticParams() {
  return stages.map((stage) => ({ id: stage.id }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const stage = stages.find((s) => s.id === id)
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
  const stage = stages.find((s) => s.id === id)
  if (!stage) notFound()

  return (
    <>
      <LandingNavbar />
      <StageDetail stage={stage} />
      <SiteFooter />
    </>
  )
}

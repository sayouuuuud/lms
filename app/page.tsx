import { LandingPage } from '@/components/landing/landing-page'
import { getCurriculum } from '@/lib/curriculum'

export default async function Page() {
  const stages = await getCurriculum()
  return <LandingPage stages={stages} />
}

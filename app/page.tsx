import { LandingPage } from '@/components/landing/landing-page'
import { getCurriculum } from '@/lib/curriculum'
import { createClient } from '@/lib/supabase/server'

export default async function Page() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const stages = await getCurriculum()
  return <LandingPage stages={stages} isLoggedIn={!!user} />
}

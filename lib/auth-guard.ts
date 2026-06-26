import 'server-only'
import { createClient } from '@/lib/supabase/server'

export async function requireAdmin(
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return false
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  return profile?.role === 'admin'
}

/** يرجّع صف students المرتبط بالمستخدم الحالي (للبوابة الطلابية). */
export async function getCurrentStudent(
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('students')
    .select('*')
    .eq('user_id', user.id)
    .single()
  return data
}

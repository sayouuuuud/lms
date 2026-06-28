'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth-guard'
import { revalidatePath } from 'next/cache'

export async function getSettings() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'global')
    .single()

  if (error || !data) return null
  return data.value
}

export async function updateSettings(newSettings: any) {
  const supabase = await createClient()
  if (!(await requireAdmin(supabase))) {
    return { error: 'غير مسموح. لازم تكون أدمن.' }
  }

  // Update the existing row; upsert (insert-if-missing) so a fresh project with
  // no settings row still saves. The unique `key` makes upsert idempotent.
  const { data, error } = await supabase
    .from('settings')
    .upsert(
      { key: 'global', value: newSettings, updated_at: new Date().toISOString() },
      { onConflict: 'key' },
    )
    .select('id')

  if (error) {
    console.log('[v0] updateSettings error:', error.message)
    return { error: 'تعذّر حفظ الإعدادات. حاول تاني.' }
  }
  if (!data || data.length === 0) {
    console.log('[v0] updateSettings: no row affected')
    return { error: 'تعذّر حفظ الإعدادات (لا يوجد صف).' }
  }
  revalidatePath('/settings')
  return { success: true }
}

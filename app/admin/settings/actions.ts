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

// Reads the site-wide accent color from the PUBLIC theme table. Unlike
// `getSettings` (admin-only RLS), this works for any visitor / device, so the
// chosen color stays consistent everywhere — even when logged out.
export async function getSiteColor(): Promise<string> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('site_theme')
    .select('active_color')
    .eq('id', true)
    .single()

  if (error || !data?.active_color) return 'navy'
  return data.active_color
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

  // Mirror the accent color into the publicly-readable theme table so it
  // applies on every device for every visitor (the settings table is
  // admin-only). Keep going even if this part fails.
  const activeColor = newSettings?.preferences?.activeColor
  if (activeColor) {
    const { error: themeError } = await supabase
      .from('site_theme')
      .upsert(
        { id: true, active_color: activeColor, updated_at: new Date().toISOString() },
        { onConflict: 'id' },
      )
    if (themeError) {
      console.log('[v0] updateSettings site_theme error:', themeError.message)
    }
  }

  // Revalidate the whole app so the root layout re-reads the new color.
  revalidatePath('/', 'layout')
  return { success: true }
}

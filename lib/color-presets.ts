export const colorPresets = [
  {
    id: 'navy',
    label: 'كحلي',
    light: { primary: 'oklch(0.27 0.066 264)', sidebar: 'oklch(0.3 0.066 264)', ring: 'oklch(0.3 0.066 264)' },
    dark: { primary: 'oklch(0.45 0.08 264)', sidebar: 'oklch(0.45 0.08 264)', ring: 'oklch(0.45 0.08 264)' },
    swatch: '#1e2a4a',
  },
  {
    id: 'violet',
    label: 'بنفسجي',
    light: { primary: 'oklch(0.55 0.21 287)', sidebar: 'oklch(0.6 0.21 287)', ring: 'oklch(0.55 0.21 287)' },
    dark: { primary: 'oklch(0.62 0.21 287)', sidebar: 'oklch(0.62 0.21 287)', ring: 'oklch(0.62 0.21 287)' },
    swatch: '#7c3aed',
  },
  {
    id: 'blue',
    label: 'أزرق',
    light: { primary: 'oklch(0.55 0.2 240)', sidebar: 'oklch(0.6 0.2 240)', ring: 'oklch(0.55 0.2 240)' },
    dark: { primary: 'oklch(0.62 0.2 240)', sidebar: 'oklch(0.62 0.2 240)', ring: 'oklch(0.62 0.2 240)' },
    swatch: '#2563eb',
  },
  {
    id: 'cyan',
    label: 'سماوي',
    light: { primary: 'oklch(0.58 0.18 210)', sidebar: 'oklch(0.62 0.18 210)', ring: 'oklch(0.58 0.18 210)' },
    dark: { primary: 'oklch(0.65 0.18 210)', sidebar: 'oklch(0.65 0.18 210)', ring: 'oklch(0.65 0.18 210)' },
    swatch: '#0891b2',
  },
  {
    id: 'green',
    label: 'أخضر',
    light: { primary: 'oklch(0.55 0.18 160)', sidebar: 'oklch(0.6 0.18 160)', ring: 'oklch(0.55 0.18 160)' },
    dark: { primary: 'oklch(0.62 0.18 160)', sidebar: 'oklch(0.62 0.18 160)', ring: 'oklch(0.62 0.18 160)' },
    swatch: '#16a34a',
  },
  {
    id: 'orange',
    label: 'برتقالي',
    light: { primary: 'oklch(0.65 0.2 55)', sidebar: 'oklch(0.68 0.2 55)', ring: 'oklch(0.65 0.2 55)' },
    dark: { primary: 'oklch(0.7 0.2 55)', sidebar: 'oklch(0.7 0.2 55)', ring: 'oklch(0.7 0.2 55)' },
    swatch: '#ea580c',
  },
  {
    id: 'rose',
    label: 'وردي',
    light: { primary: 'oklch(0.58 0.22 10)', sidebar: 'oklch(0.62 0.22 10)', ring: 'oklch(0.58 0.22 10)' },
    dark: { primary: 'oklch(0.65 0.22 10)', sidebar: 'oklch(0.65 0.22 10)', ring: 'oklch(0.65 0.22 10)' },
    swatch: '#e11d48',
  },
] as const

export type PresetId = (typeof colorPresets)[number]['id']

/**
 * The dashboard palette lives on the `.theme-dashboard` scope so the public
 * site keeps its own brand colours. The preset therefore has to be written as
 * a stylesheet rule targeting that scope — writing inline custom properties on
 * <html> would leak the dashboard colour into the landing/auth pages.
 */
export function applyColorPreset(id: PresetId | string) {
  const preset = colorPresets.find((p) => p.id === id)
  if (!preset) return

  let styleEl = document.getElementById('dynamic-theme') as HTMLStyleElement | null
  if (!styleEl) {
    styleEl = document.createElement('style')
    styleEl.id = 'dynamic-theme'
    document.head.appendChild(styleEl)
  }

  styleEl.innerHTML = `.theme-dashboard { --primary: ${preset.light.primary}; --ring: ${preset.light.ring}; --sidebar-primary: ${preset.light.sidebar}; --sidebar-accent: ${preset.light.sidebar}; --sidebar-ring: ${preset.light.ring}; }
.dark .theme-dashboard { --primary: ${preset.dark.primary}; --ring: ${preset.dark.ring}; --sidebar-primary: ${preset.dark.sidebar}; --sidebar-accent: ${preset.dark.sidebar}; --sidebar-ring: ${preset.dark.ring}; }`

  // Clear any legacy inline overrides left on <html> by older builds.
  const root = document.documentElement
  for (const prop of ['--primary', '--ring', '--sidebar-primary', '--sidebar-accent', '--sidebar-ring']) {
    root.style.removeProperty(prop)
  }

  try {
    localStorage.setItem('color-preset', id)
  } catch {}
}

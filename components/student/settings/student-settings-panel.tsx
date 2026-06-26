'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  User,
  Bell,
  Shield,
  SlidersHorizontal,
  Camera,
  Check,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { ToggleSwitch } from '@/components/settings/toggle-switch'
import { useStudent } from '@/components/student/student-context'
import { updateStudentProfile } from '@/app/student/actions'

// ── Color presets ──────────────────────────────────────────────
const colorPresets = [
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

type PresetId = (typeof colorPresets)[number]['id']

function applyColorPreset(id: PresetId) {
  const preset = colorPresets.find((p) => p.id === id)
  if (!preset) return
  const isDark = document.documentElement.classList.contains('dark')
  const vals = isDark ? preset.dark : preset.light
  const root = document.documentElement
  root.style.setProperty('--primary', vals.primary)
  root.style.setProperty('--ring', vals.ring)
  root.style.setProperty('--sidebar-primary', vals.sidebar)
  root.style.setProperty('--sidebar-accent', vals.sidebar)
  root.style.setProperty('--sidebar-ring', vals.ring)
  localStorage.setItem('color-preset', id)
}

const tabs = [
  { id: 'profile', label: 'الملف الشخصي', icon: User },
  { id: 'notifications', label: 'الإشعارات', icon: Bell },
  { id: 'security', label: 'الأمان', icon: Shield },
  { id: 'preferences', label: 'التفضيلات', icon: SlidersHorizontal },
] as const

type TabId = (typeof tabs)[number]['id']

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1.5 block text-right text-sm font-medium text-foreground">
      {children}
    </label>
  )
}

export function StudentSettingsPanel({ profile: initProfile }: { profile?: any }) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabId>('profile')
  const { profile: contextProfile } = useStudent()
  const studentProfile = initProfile || contextProfile || {}
  const nameParts = (studentProfile.name || '').trim().split(/\s+/).filter(Boolean)
  const firstName = nameParts[0] ?? ''
  const lastName = nameParts.slice(1).join(' ')

  // profile form (controlled so we can save)
  const [profFirst, setProfFirst] = useState(firstName)
  const [profLast, setProfLast] = useState(lastName)
  const [profPhone, setProfPhone] = useState(studentProfile.phone ?? '')
  const [savingProfile, setSavingProfile] = useState(false)

  async function handleSaveProfile() {
    setSavingProfile(true)
    const res = await updateStudentProfile({
      fullName: `${profFirst} ${profLast}`.trim(),
      phone: profPhone,
    })
    setSavingProfile(false)
    if (res?.error) {
      toast.error(res.error)
      return
    }
    toast.success('تم حفظ بياناتك بنجاح')
    router.refresh()
  }

  // notification preferences
  const [emailNotif, setEmailNotif] = useState(true)
  const [pushNotif, setPushNotif] = useState(true)
  const [smsNotif, setSmsNotif] = useState(false)
  const [lessonReminders, setLessonReminders] = useState(true)
  const [gradeAlerts, setGradeAlerts] = useState(true)
  const [marketingNotif, setMarketingNotif] = useState(false)

  // preferences
  const [darkMode, setDarkMode] = useState(false)
  const [activeColor, setActiveColor] = useState<PresetId>(
    () =>
      (typeof window !== 'undefined'
        ? (localStorage.getItem('color-preset') as PresetId)
        : null) ?? 'navy',
  )

  function handleColorChange(id: PresetId) {
    setActiveColor(id)
    applyColorPreset(id)
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      {/* Tabs nav */}
      <div className="rounded-2xl border border-border bg-card p-2">
        <nav className="flex gap-1 overflow-x-auto lg:flex-col">
          {tabs.map((tab) => {
            const active = tab.id === activeTab
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <tab.icon className="size-4 shrink-0" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Panel content */}
      <div className="rounded-2xl border border-border bg-card p-6">
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <div className="text-right">
              <h3 className="text-lg font-bold text-foreground">الملف الشخصي</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                حدّث معلوماتك الشخصية وصورة الحساب
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="size-20 ring-2 ring-primary/30">
                  <AvatarFallback className="bg-primary/15 text-xl font-semibold text-primary">
                    {studentProfile.initials}
                  </AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  className="absolute -bottom-1 -left-1 flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow"
                  aria-label="تغيير الصورة"
                >
                  <Camera className="size-3.5" />
                </button>
              </div>
              <div className="text-right">
                <p className="text-base font-semibold text-foreground">
                  {studentProfile.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {studentProfile.level} · {studentProfile.id}
                </p>
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel>الاسم الأول</FieldLabel>
                <Input
                  value={profFirst}
                  onChange={(e) => setProfFirst(e.target.value)}
                  className="text-right"
                />
              </div>
              <div>
                <FieldLabel>الاسم الأخير</FieldLabel>
                <Input
                  value={profLast}
                  onChange={(e) => setProfLast(e.target.value)}
                  className="text-right"
                />
              </div>
              <div>
                <FieldLabel>البريد الإلكتروني</FieldLabel>
                <Input
                  type="email"
                  value={studentProfile.email ?? ''}
                  readOnly
                  className="text-right opacity-70"
                  dir="ltr"
                />
              </div>
              <div>
                <FieldLabel>رقم الهاتف</FieldLabel>
                <Input
                  type="tel"
                  value={profPhone}
                  onChange={(e) => setProfPhone(e.target.value)}
                  placeholder="01xxxxxxxxx"
                  className="text-right"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="flex justify-start gap-3">
              <Button onClick={handleSaveProfile} disabled={savingProfile}>
                {savingProfile && <Loader2 className="size-4 animate-spin" />}
                حفظ التغييرات
              </Button>
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  setProfFirst(firstName)
                  setProfLast(lastName)
                  setProfPhone(studentProfile.phone ?? '')
                }}
              >
                إلغاء
              </Button>
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-2">
            <div className="text-right">
              <h3 className="text-lg font-bold text-foreground">الإشعارات</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                تحكّم في طريقة استقبالك للتنبيهات
              </p>
            </div>
            <Separator className="my-4" />
            <div className="divide-y divide-border">
              <ToggleSwitch
                checked={emailNotif}
                onChange={setEmailNotif}
                label="إشعارات البريد الإلكتروني"
                description="استقبال التنبيهات عبر البريد الإلكتروني"
              />
              <ToggleSwitch
                checked={pushNotif}
                onChange={setPushNotif}
                label="الإشعارات الفورية"
                description="إشعارات منبثقة على المتصفح والجوال"
              />
              <ToggleSwitch
                checked={lessonReminders}
                onChange={setLessonReminders}
                label="تذكير المحاضرات والمواعيد"
                description="تنبيهات قبل بدء المحاضرات ومواعيد التسليم"
              />
              <ToggleSwitch
                checked={gradeAlerts}
                onChange={setGradeAlerts}
                label="تنبيهات الدرجات"
                description="إشعار فور رصد درجات الاختبارات والواجبات"
              />
              <ToggleSwitch
                checked={smsNotif}
                onChange={setSmsNotif}
                label="الرسائل النصية"
                description="استقبال التنبيهات الهامة عبر SMS"
              />
              <ToggleSwitch
                checked={marketingNotif}
                onChange={setMarketingNotif}
                label="رسائل تسويقية"
                description="عروض الكورسات الجديدة وأخبار المنصة"
              />
            </div>
            <div className="flex justify-start pt-4">
              <Button>حفظ التفضيلات</Button>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-6">
            <div className="text-right">
              <h3 className="text-lg font-bold text-foreground">الأمان</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                إدارة كلمة المرور وحماية حسابك
              </p>
            </div>
            <Separator />
            <div className="grid gap-4 sm:max-w-md">
              <div>
                <FieldLabel>كلمة المرور الحالية</FieldLabel>
                <Input type="password" defaultValue="password" dir="ltr" />
              </div>
              <div>
                <FieldLabel>كلمة المرور الجديدة</FieldLabel>
                <Input type="password" dir="ltr" />
              </div>
              <div>
                <FieldLabel>تأكيد كلمة المرور</FieldLabel>
                <Input type="password" dir="ltr" />
              </div>
            </div>
            <Separator />
            <div className="rounded-xl border border-border bg-muted/40 p-4">
              <ToggleSwitch
                checked={true}
                onChange={() => {}}
                label="المصادقة الثنائية"
                description="طبقة حماية إضافية عند تسجيل الدخول"
              />
            </div>
            <div className="flex justify-start gap-3">
              <Button>تحديث كلمة المرور</Button>
            </div>
          </div>
        )}

        {activeTab === 'preferences' && (
          <div className="space-y-2">
            <div className="text-right">
              <h3 className="text-lg font-bold text-foreground">التفضيلات</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                خصّص تجربتك داخل بوابة الطالب
              </p>
            </div>
            <Separator className="my-4" />
            <div className="divide-y divide-border">
              <ToggleSwitch
                checked={darkMode}
                onChange={setDarkMode}
                label="الوضع الليلي"
                description="استخدام السمة الداكنة للواجهة"
              />
            </div>

            {/* Color picker */}
            <div className="mt-4 rounded-xl border border-border bg-muted/30 p-4">
              <p className="mb-3 text-right text-sm font-medium text-foreground">
                لون الموقع
              </p>
              <p className="mb-4 text-right text-xs text-muted-foreground">
                اختر اللون الرئيسي للواجهة وسيتطبق فوراً على السايدبار والأزرار
              </p>
              <div className="flex flex-wrap gap-3">
                {colorPresets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleColorChange(preset.id)}
                    title={preset.label}
                    aria-label={preset.label}
                    className={cn(
                      'group relative flex size-10 items-center justify-center rounded-full transition-transform hover:scale-110',
                      activeColor === preset.id &&
                        'ring-2 ring-offset-2 ring-offset-card ring-foreground/30',
                    )}
                    style={{ backgroundColor: preset.swatch }}
                  >
                    {activeColor === preset.id && (
                      <Check className="size-4 text-white drop-shadow" strokeWidth={3} />
                    )}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-right text-xs text-muted-foreground">
                اللون الحالي:{' '}
                <span className="font-semibold text-foreground">
                  {colorPresets.find((p) => p.id === activeColor)?.label}
                </span>
              </p>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel>اللغة</FieldLabel>
                <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-right text-sm shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring">
                  <option>العربية</option>
                  <option>English</option>
                </select>
              </div>
              <div>
                <FieldLabel>المنطقة الزمنية</FieldLabel>
                <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-right text-sm shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring">
                  <option>(GMT+2) القاهرة</option>
                  <option>(GMT+3) الرياض</option>
                  <option>(GMT+4) دبي</option>
                </select>
              </div>
            </div>
            <div className="flex justify-start pt-4">
              <Button>حفظ التفضيلات</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

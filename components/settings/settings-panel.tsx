'use client'

import { useState } from 'react'
import {
  User,
  Bell,
  Shield,
  SlidersHorizontal,
  Camera,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { ToggleSwitch } from '@/components/settings/toggle-switch'

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

export function SettingsPanel() {
  const [activeTab, setActiveTab] = useState<TabId>('profile')

  // notification preferences
  const [emailNotif, setEmailNotif] = useState(true)
  const [pushNotif, setPushNotif] = useState(true)
  const [smsNotif, setSmsNotif] = useState(false)
  const [marketingNotif, setMarketingNotif] = useState(false)
  const [weeklyReport, setWeeklyReport] = useState(true)

  // preferences
  const [darkMode, setDarkMode] = useState(false)
  const [autoPublish, setAutoPublish] = useState(false)

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
                    م أ
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
                <p className="text-base font-semibold text-foreground">محمد أحمد</p>
                <p className="text-sm text-muted-foreground">مدير المنصة</p>
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel>الاسم الأول</FieldLabel>
                <Input defaultValue="محمد" className="text-right" />
              </div>
              <div>
                <FieldLabel>الاسم الأخير</FieldLabel>
                <Input defaultValue="أحمد" className="text-right" />
              </div>
              <div>
                <FieldLabel>البريد الإلكتروني</FieldLabel>
                <Input
                  type="email"
                  defaultValue="mohamed@platform.com"
                  className="text-right"
                  dir="ltr"
                />
              </div>
              <div>
                <FieldLabel>رقم الهاتف</FieldLabel>
                <Input
                  type="tel"
                  defaultValue="+20 100 123 4567"
                  className="text-right"
                  dir="ltr"
                />
              </div>
              <div className="sm:col-span-2">
                <FieldLabel>نبذة تعريفية</FieldLabel>
                <textarea
                  rows={3}
                  defaultValue="مدير منصة تعليمية متخصصة في الدورات التقنية."
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-right text-sm shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
            </div>

            <div className="flex justify-start gap-3">
              <Button>حفظ التغييرات</Button>
              <Button variant="outline">إلغاء</Button>
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
                checked={smsNotif}
                onChange={setSmsNotif}
                label="الرسائل النصية"
                description="استقبال التنبيهات الهامة عبر SMS"
              />
              <ToggleSwitch
                checked={marketingNotif}
                onChange={setMarketingNotif}
                label="رسائل تسويقية"
                description="عروض وأخبار المنصة والتحديثات"
              />
              <ToggleSwitch
                checked={weeklyReport}
                onChange={setWeeklyReport}
                label="التقرير الأسبوعي"
                description="ملخص أسبوعي لأداء المنصة"
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
                خصّص تجربتك داخل لوحة الإدارة
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
              <ToggleSwitch
                checked={autoPublish}
                onChange={setAutoPublish}
                label="النشر التلقائي"
                description="نشر الكورسات الجديدة تلقائياً بعد المراجعة"
              />
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
              <div>
                <FieldLabel>العملة</FieldLabel>
                <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-right text-sm shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring">
                  <option>جنيه مصري (EGP)</option>
                  <option>ريال سعودي (SAR)</option>
                  <option>دولار أمريكي (USD)</option>
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

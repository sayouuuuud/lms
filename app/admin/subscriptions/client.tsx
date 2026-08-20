"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { createPlan, togglePlanActive, updateSettings } from "./actions"

type Plan = {
  id: string
  title: string
  description: string
  price: any // Decimal
  duration_days: number
  is_active: boolean
  created_at: Date
}

type Settings = {
  subscription_mode: string
  grace_period_days: number
}

export default function SubscriptionsClient({
  initialPlans,
  settings
}: {
  initialPlans: Plan[]
  settings: Settings | null
}) {
  // Settings State
  const [subMode, setSubMode] = useState(settings?.subscription_mode || "purchases_only")
  const [gracePeriod, setGracePeriod] = useState(settings?.grace_period_days?.toString() || "3")

  // New Plan State
  const [newTitle, setNewTitle] = useState("")
  const [newDesc, setNewDesc] = useState("")
  const [newPrice, setNewPrice] = useState("")
  const [newDuration, setNewDuration] = useState("30")

  const handleSaveSettings = async () => {
    await updateSettings(subMode, parseInt(gracePeriod) || 0)
    alert("تم حفظ الإعدادات بنجاح!")
  }

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle || !newPrice || !newDuration) return

    await createPlan({
      title: newTitle,
      description: newDesc,
      price: parseFloat(newPrice),
      duration_days: parseInt(newDuration)
    })
    
    setNewTitle("")
    setNewDesc("")
    setNewPrice("")
    setNewDuration("30")
    alert("تم إنشاء الخطة بنجاح!")
  }

  const handleTogglePlan = async (id: string, currentStatus: boolean) => {
    await togglePlanActive(id, !currentStatus)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Settings Column */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>إعدادات النظام</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">نظام الدفع (Subscription Mode)</label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={subMode} 
                onChange={e => setSubMode(e.target.value)}
              >
                <option value="purchases_only">شراء فردي فقط (purchases_only)</option>
                <option value="subscriptions_only">اشتراكات فقط (subscriptions_only)</option>
                <option value="both">كلاهما (both)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">فترة السماح بالأيام (Grace Period)</label>
              <Input 
                type="number" 
                value={gracePeriod} 
                onChange={e => setGracePeriod(e.target.value)} 
                min="0"
              />
            </div>

            <Button onClick={handleSaveSettings} className="w-full">
              حفظ الإعدادات
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>إضافة خطة جديدة</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreatePlan} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">اسم الخطة</label>
                <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">الوصف</label>
                <Input value={newDesc} onChange={e => setNewDesc(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">السعر</label>
                  <Input type="number" step="0.01" value={newPrice} onChange={e => setNewPrice(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">المدة (أيام)</label>
                  <Input type="number" value={newDuration} onChange={e => setNewDuration(e.target.value)} required />
                </div>
              </div>
              <Button type="submit" className="w-full">إضافة الخطة</Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Plans List Column */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>الخطط الحالية</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">اسم الخطة</TableHead>
                    <TableHead className="text-right">السعر</TableHead>
                    <TableHead className="text-right">المدة (أيام)</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">تفعيل/إيقاف</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {initialPlans.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4">
                        لا توجد خطط اشتراك
                      </TableCell>
                    </TableRow>
                  ) : (
                    initialPlans.map((plan) => (
                      <TableRow key={plan.id}>
                        <TableCell>
                          <div className="font-medium">{plan.title}</div>
                          <div className="text-xs text-muted-foreground">{plan.description}</div>
                        </TableCell>
                        <TableCell>{Number(plan.price).toFixed(2)}</TableCell>
                        <TableCell>{plan.duration_days}</TableCell>
                        <TableCell>
                          <span className={plan.is_active ? "text-green-600" : "text-red-600"}>
                            {plan.is_active ? "نشطة" : "موقوفة"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant={plan.is_active ? "destructive" : "secondary"} 
                            size="sm"
                            onClick={() => handleTogglePlan(plan.id, plan.is_active)}
                          >
                            {plan.is_active ? "إيقاف" : "تفعيل"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

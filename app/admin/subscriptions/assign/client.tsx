"use client"
import { useState, useEffect } from "react"
import { searchStudents, getActivePlans, assignSubscriptionToStudent } from "./actions"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Search, Loader2 } from "lucide-react"

export function AssignSubscriptionClient() {
  const [query, setQuery] = useState("")
  const [students, setStudents] = useState<any[]>([])
  const [plans, setPlans] = useState<any[]>([])
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<string>("")
  const [loadingSearch, setLoadingSearch] = useState(false)
  const [assigning, setAssigning] = useState(false)

  useEffect(() => {
    getActivePlans().then(setPlans)
  }, [])

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (query.trim().length > 1) {
        setLoadingSearch(true)
        const res = await searchStudents(query)
        setStudents(res)
        setLoadingSearch(false)
      } else {
        setStudents([])
      }
    }, 500)

    return () => clearTimeout(delayDebounceFn)
  }, [query])

  const handleAssign = async () => {
    if (!selectedStudent || !selectedPlan) {
      toast.error("يرجى اختيار الطالب والباقة")
      return
    }

    try {
      setAssigning(true)
      await assignSubscriptionToStudent(selectedStudent, selectedPlan)
      toast.success("تم إسناد الاشتراك بنجاح")
      setQuery("")
      setSelectedStudent(null)
      setSelectedPlan("")
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ أثناء الإسناد")
    } finally {
      setAssigning(false)
    }
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>البحث عن طالب</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="relative">
          <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input 
            className="pl-3 pr-9" 
            placeholder="ابحث بالاسم أو الكود أو رقم الهاتف..." 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {loadingSearch && <Loader2 className="absolute left-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />}
        </div>

        {students.length > 0 && (
          <div className="border rounded-md divide-y overflow-hidden">
            {students.map(student => (
              <div 
                key={student.id} 
                onClick={() => setSelectedStudent(student.id)}
                className={`p-3 cursor-pointer hover:bg-muted transition-colors ${selectedStudent === student.id ? 'bg-primary/10' : ''}`}
              >
                <div className="font-semibold">{student.name}</div>
                <div className="text-sm text-muted-foreground">الكود: {student.code} | الهاتف: {student.phone || '-'}</div>
              </div>
            ))}
          </div>
        )}

        {selectedStudent && (
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-medium">اختر الباقة</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {plans.map(plan => (
                <div 
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`border rounded-lg p-4 cursor-pointer hover:border-primary transition-all ${selectedPlan === plan.id ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : ''}`}
                >
                  <div className="font-bold">{plan.title}</div>
                  <div className="text-sm text-muted-foreground">{plan.duration_days} يوم</div>
                  <div className="mt-2 text-lg font-bold text-primary">{plan.price} ج.م</div>
                </div>
              ))}
            </div>

            <Button 
              className="w-full mt-6" 
              onClick={handleAssign}
              disabled={assigning || !selectedPlan}
            >
              {assigning && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              تأكيد إسناد الاشتراك
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

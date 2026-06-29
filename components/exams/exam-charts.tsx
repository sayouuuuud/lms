'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts'
import type { ExamSubmissionDetail } from '@/app/admin/exams/[id]/actions'

export function ExamCharts({ submissions }: { submissions: ExamSubmissionDetail[] }) {
  const { distributionData, passFailData } = useMemo(() => {
    // Score Distribution (0-20, 21-40, 41-60, 61-80, 81-100)
    const distribution = [
      { name: '0-20%', count: 0 },
      { name: '21-40%', count: 0 },
      { name: '41-60%', count: 0 },
      { name: '61-80%', count: 0 },
      { name: '81-100%', count: 0 },
    ]

    let passed = 0
    let failed = 0

    submissions.forEach((sub) => {
      const percentage = (sub.score / sub.total) * 100
      
      if (percentage <= 20) distribution[0].count++
      else if (percentage <= 40) distribution[1].count++
      else if (percentage <= 60) distribution[2].count++
      else if (percentage <= 80) distribution[3].count++
      else distribution[4].count++

      if (percentage >= 50) passed++
      else failed++
    })

    return {
      distributionData: distribution,
      passFailData: [
        { name: 'ناجح', value: passed, color: 'hsl(var(--success))' },
        { name: 'راسب', value: failed, color: 'hsl(var(--destructive))' },
      ]
    }
  }, [submissions])

  if (submissions.length === 0) {
    return null
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg shadow-sm p-3 font-sans">
          <p className="text-sm font-semibold mb-1">{label}</p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: payload[0].payload.color || 'hsl(var(--primary))' }} />
            <p className="text-sm text-muted-foreground">
              {payload[0].value} {payload[0].value === 1 ? 'طالب' : 'طلاب'}
            </p>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 font-sans">
      <Card className="col-span-4">
        <CardHeader>
          <CardTitle>توزيع الدرجات</CardTitle>
          <CardDescription>نظرة عامة على مستويات أداء الطلاب في هذا الاختبار</CardDescription>
        </CardHeader>
        <CardContent className="pl-2">
          <div className="h-[300px] w-full mt-4" style={{ fontFamily: 'var(--font-cairo), sans-serif' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distributionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontFamily: 'var(--font-cairo), sans-serif' }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontFamily: 'var(--font-cairo), sans-serif' }}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--secondary))', opacity: 0.4 }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={50}>
                  {distributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={`hsl(var(--chart-${index + 1}))`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="col-span-3">
        <CardHeader>
          <CardTitle>نسبة النجاح والرسوب</CardTitle>
          <CardDescription>توزيع الطلاب حسب اجتياز الاختبار</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center" style={{ fontFamily: 'var(--font-cairo), sans-serif' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={passFailData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  {passFailData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => [`${value} ${value === 1 ? 'طالب' : 'طلاب'}`, 'العدد']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--background))', fontFamily: 'var(--font-cairo), sans-serif' }}
                  itemStyle={{ fontFamily: 'var(--font-cairo), sans-serif' }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36} 
                  iconType="circle"
                  formatter={(value) => <span className="text-sm font-medium ml-1" style={{ fontFamily: 'var(--font-cairo), sans-serif' }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

'use client'

import { Card } from '@/components/ui/card'
import { Users, Target, Activity, HelpCircle } from 'lucide-react'
import type { ExamDetailsData } from '@/app/admin/exams/[id]/actions'
import { motion } from 'framer-motion'

export function ExamStats({ data }: { data: ExamDetailsData }) {
  const passedCount = data.submissions.filter((s) => (s.score / s.total) * 100 >= 50).length
  const passRate = data.participants > 0 ? Math.round((passedCount / data.participants) * 100) : 0

  const stats = [
    {
      title: 'متوسط الدرجات',
      value: data.avgScore > 0 ? `${data.avgScore}%` : '-',
      icon: Target,
      color: 'text-primary',
      bg: 'bg-primary/10',
      delay: 0.1,
    },
    {
      title: 'نسبة النجاح',
      value: data.participants > 0 ? `${passRate}%` : '-',
      icon: Activity,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      delay: 0.2,
    },
    {
      title: 'عدد المشاركين',
      value: data.participants.toLocaleString('ar-EG'),
      icon: Users,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
      delay: 0.3,
    },
    {
      title: 'عدد الأسئلة',
      value: data.questionsCount,
      icon: HelpCircle,
      color: 'text-indigo-500',
      bg: 'bg-indigo-500/10',
      delay: 0.4,
    }
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <motion.div
          key={stat.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: stat.delay, duration: 0.4, ease: "easeOut" }}
        >
          <Card className="group relative overflow-hidden p-6 transition-all duration-300 hover:shadow-lg hover:border-primary/30 hover:-translate-y-1">
            <div className={`absolute -right-4 -top-4 size-28 rounded-full blur-2xl opacity-20 transition-opacity duration-500 group-hover:opacity-40 ${stat.bg}`} />
            
            <div className="relative flex items-center gap-4">
              <div className={`flex size-14 shrink-0 items-center justify-center rounded-2xl ${stat.bg} ${stat.color} transition-transform duration-300 group-hover:scale-110 shadow-sm border border-background/20`}>
                <stat.icon className="size-7" />
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                <p className="text-3xl font-bold tracking-tight text-foreground">
                  {stat.value}
                </p>
              </div>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}

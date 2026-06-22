'use client'

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { PanelCard } from './panel-card'
import { studentsData } from '@/lib/dashboard-data'

const config = {
  students: { label: 'الطلاب', color: 'var(--chart-2)' },
} satisfies ChartConfig

export function StudentsChart() {
  return (
    <PanelCard title="نمو الطلاب" filter="آخر 6 أشهر">
      <ChartContainer config={config} className="h-[240px] w-full">
        <AreaChart data={studentsData} margin={{ left: 4, right: 8, top: 8 }}>
          <defs>
            <linearGradient id="fillStudents" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-students)" stopOpacity={0.35} />
              <stop offset="95%" stopColor="var(--color-students)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={44}
            tickFormatter={(v) => `${v / 1000}K`}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value) => [`${Number(value).toLocaleString('en')} طالب`, '']}
              />
            }
          />
          <Area
            dataKey="students"
            type="monotone"
            stroke="var(--color-students)"
            strokeWidth={2.5}
            fill="url(#fillStudents)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ChartContainer>
    </PanelCard>
  )
}

'use client'

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { PanelCard } from '@/components/dashboard/panel-card'
import { monthlyRevenue } from '@/lib/reports-data'

const config = {
  revenue: { label: 'الإيرادات', color: 'var(--chart-1)' },
  target: { label: 'المستهدف', color: 'var(--chart-2)' },
} satisfies ChartConfig

export function RevenueReportChart() {
  return (
    <PanelCard title="الإيرادات مقابل المستهدف" filter="آخر 6 أشهر">
      <ChartContainer config={config} className="h-[260px] w-full">
        <BarChart data={monthlyRevenue} margin={{ left: 4, right: 8, top: 8 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis tickLine={false} axisLine={false} width={44} tickFormatter={(v) => `${v / 1000}K`} />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value, name) => [
                  `${Number(value).toLocaleString('en')} ج.م`,
                  config[name as keyof typeof config]?.label ?? '',
                ]}
              />
            }
          />
          <ChartLegend content={<ChartLegendContent />} />
          <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[6, 6, 0, 0]} isAnimationActive={false} />
          <Bar dataKey="target" fill="var(--color-target)" radius={[6, 6, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ChartContainer>
    </PanelCard>
  )
}

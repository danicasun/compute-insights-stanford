"use client"

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts"
import {
  chartGridProps,
  chartMargin,
  chartTooltipContentStyle,
  COLOR_DERIVED,
  COLOR_JOBS,
} from "@/lib/temporal-chart-styles"

interface HourFallbackChartsProps {
  rows: Array<{
    start_hour: string
    job_count: number
    energy_total_kwh: number
    energy_mean_kwh: number
    energy_per_job_kwh: number
  }>
  energyUnit: string
}

export function HourFallbackCharts({ rows, energyUnit }: HourFallbackChartsProps) {
  return (
    <div className="space-y-8">
      <div>
        <p className="mb-2 text-xs font-medium text-foreground">Jobs by start hour (UTC)</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={rows} margin={chartMargin}>
            <CartesianGrid {...chartGridProps} />
            <XAxis dataKey="start_hour" tick={{ fontSize: 11 }} stroke="#d1d5db" />
            <YAxis tick={{ fontSize: 11 }} stroke="#d1d5db" />
            <Tooltip
              contentStyle={chartTooltipContentStyle}
              formatter={(v: number) => [v.toLocaleString(), "Jobs"]}
            />
            <Bar dataKey="job_count" fill={COLOR_JOBS} fillOpacity={0.75} name="Jobs" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div>
        <p className="mb-2 text-xs font-medium text-foreground">Energy per job by start hour (UTC)</p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={rows} margin={chartMargin}>
            <CartesianGrid {...chartGridProps} />
            <XAxis dataKey="start_hour" tick={{ fontSize: 11 }} stroke="#d1d5db" />
            <YAxis tick={{ fontSize: 11 }} stroke="#d1d5db" />
            <Tooltip
              contentStyle={chartTooltipContentStyle}
              formatter={(v: number) => [v.toFixed(3), `${energyUnit}/job`]}
            />
            <Line
              type="monotone"
              dataKey="energy_per_job_kwh"
              stroke={COLOR_DERIVED}
              strokeWidth={2}
              dot={false}
              name="Energy / job"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

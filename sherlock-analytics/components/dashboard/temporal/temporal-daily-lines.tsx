"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  ReferenceDot,
} from "recharts"
import type { EnrichedDayRow } from "@/lib/temporal-metrics"
import {
  chartGridProps,
  chartMargin,
  chartTooltipContentStyle,
  COLOR_ENERGY,
  COLOR_JOBS,
  COLOR_PEAK,
} from "@/lib/temporal-chart-styles"

interface TemporalDailyLinesProps {
  rows: EnrichedDayRow[]
  energyUnit: string
}

function shortDate(iso: string) {
  try {
    const d = new Date(iso + "T12:00:00Z")
    return d.toLocaleDateString("en-CA", { month: "short", day: "numeric" })
  } catch {
    return iso
  }
}

export function TemporalDailyLines({ rows, energyUnit }: TemporalDailyLinesProps) {
  const chartData = rows.map((r) => ({ ...r }))

  return (
    <div className="space-y-8">
      <div>
        <p className="mb-2 text-xs font-medium text-foreground">Job count per UTC day</p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={chartMargin}>
            <CartesianGrid {...chartGridProps} />
            <XAxis
              dataKey="start_day"
              tickFormatter={shortDate}
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              stroke="#d1d5db"
              interval="preserveStartEnd"
              minTickGap={28}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              stroke="#d1d5db"
              tickFormatter={(v) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}k` : String(v))}
            />
            <Tooltip
              contentStyle={chartTooltipContentStyle}
              labelFormatter={(l) => `UTC ${l}`}
            />
            <Line
              type="monotone"
              dataKey="job_count"
              stroke={COLOR_JOBS}
              strokeWidth={1}
              strokeOpacity={0.35}
              dot={false}
              name="Jobs (daily)"
            />
            <Line
              type="monotone"
              dataKey="rolling7_job_count"
              stroke={COLOR_JOBS}
              strokeWidth={2.5}
              strokeOpacity={1}
              dot={false}
              name="Jobs (7-pt mean)"
            />
            {chartData
              .filter((d) => d.peakVolume)
              .map((d) => (
                <ReferenceDot
                  key={`pv-${d.start_day}`}
                  x={d.start_day}
                  y={d.job_count}
                  r={4}
                  fill={COLOR_PEAK}
                  stroke="#fff"
                  strokeWidth={1}
                />
              ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div>
        <p className="mb-2 text-xs font-medium text-foreground">Mean energy per job per UTC day</p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={chartMargin}>
            <CartesianGrid {...chartGridProps} />
            <XAxis
              dataKey="start_day"
              tickFormatter={shortDate}
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              stroke="#d1d5db"
              interval="preserveStartEnd"
              minTickGap={28}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              stroke="#d1d5db"
            />
            <Tooltip
              contentStyle={chartTooltipContentStyle}
              labelFormatter={(l) => `UTC ${l}`}
              formatter={(v: number) => [v.toFixed(2), `${energyUnit}/job (mean)`]}
            />
            <Line
              type="monotone"
              dataKey="energy_mean_kwh"
              stroke={COLOR_ENERGY}
              strokeWidth={1}
              strokeOpacity={0.35}
              dot={false}
              name="Mean energy (daily)"
            />
            <Line
              type="monotone"
              dataKey="rolling7_energy_mean_kwh"
              stroke={COLOR_ENERGY}
              strokeWidth={2.5}
              strokeOpacity={1}
              dot={false}
              name="Mean energy (7-pt mean)"
            />
            {chartData
              .filter((d) => d.peakEnergyTotal)
              .map((d) => (
                <ReferenceDot
                  key={`pe-${d.start_day}`}
                  x={d.start_day}
                  y={d.energy_mean_kwh}
                  r={4}
                  fill={COLOR_PEAK}
                  stroke="#fff"
                  strokeWidth={1}
                />
              ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

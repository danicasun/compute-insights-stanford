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
  COLOR_ANOMALY,
  COLOR_DERIVED,
} from "@/lib/temporal-chart-styles"

interface TemporalEfficiencyChartProps {
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

export function TemporalEfficiencyChart({ rows, energyUnit }: TemporalEfficiencyChartProps) {
  const chartData = rows.map((r) => ({ ...r }))

  return (
    <div>
      <p className="mb-2 text-xs font-medium text-foreground">Total energy ÷ job count (per UTC day)</p>
      <ResponsiveContainer width="100%" height={240}>
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
            label={{ value: `${energyUnit}/job`, angle: -90, position: "insideLeft", fontSize: 11 }}
          />
          <Tooltip
            contentStyle={chartTooltipContentStyle}
            labelFormatter={(l) => `UTC ${l}`}
            formatter={(v: number) => [v.toFixed(3), `Energy / job (${energyUnit}/job)`]}
          />
          <Line
            type="monotone"
            dataKey="energy_per_job_kwh"
            stroke={COLOR_DERIVED}
            strokeWidth={1}
            strokeOpacity={0.35}
            dot={false}
            name="Daily"
          />
          <Line
            type="monotone"
            dataKey="rolling7_energy_per_job_kwh"
            stroke={COLOR_DERIVED}
            strokeWidth={2.5}
            strokeOpacity={1}
            dot={false}
            name="7-pt mean"
          />
          {chartData
            .filter((d) => d.efficiencyAnomaly)
            .map((d) => (
              <ReferenceDot
                key={`ea-${d.start_day}`}
                x={d.start_day}
                y={d.energy_per_job_kwh}
                r={5}
                fill={COLOR_ANOMALY}
                stroke="#fff"
                strokeWidth={1}
              />
            ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

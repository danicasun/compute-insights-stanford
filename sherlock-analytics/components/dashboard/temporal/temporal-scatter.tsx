"use client"

import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ZAxis,
  Cell,
} from "recharts"
import type { EnrichedDayRow } from "@/lib/temporal-metrics"
import { chartGridProps, chartMargin, COLOR_ANOMALY, COLOR_ENERGY } from "@/lib/temporal-chart-styles"
import { TemporalScatterTooltip } from "@/components/dashboard/temporal/temporal-scatter-tooltip"

interface TemporalScatterProps {
  rows: EnrichedDayRow[]
  energyUnit: string
}

export function TemporalScatter({ rows, energyUnit }: TemporalScatterProps) {
  const data = rows.map((r) => ({
    job_count: r.job_count,
    energy_mean_kwh: r.energy_mean_kwh,
    start_day: r.start_day,
    energy_per_job_kwh: r.energy_per_job_kwh,
    efficiencyAnomaly: r.efficiencyAnomaly,
  }))

  return (
    <ResponsiveContainer width="100%" height={320}>
      <ScatterChart margin={{ ...chartMargin, bottom: 28 }}>
        <CartesianGrid {...chartGridProps} />
        <XAxis
          type="number"
          dataKey="job_count"
          name="Jobs"
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          stroke="#d1d5db"
          label={{ value: "Daily job count", position: "bottom", offset: 12, fontSize: 11 }}
        />
        <YAxis
          type="number"
          dataKey="energy_mean_kwh"
          name="Mean energy"
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          stroke="#d1d5db"
          label={{ value: `Mean energy (${energyUnit}/job)`, angle: -90, position: "insideLeft", fontSize: 11 }}
        />
        <ZAxis range={[48, 48]} />
        <Tooltip
          cursor={{ strokeDasharray: "3 3" }}
          content={(props) => <TemporalScatterTooltip {...props} energyUnit={energyUnit} />}
        />
        <Scatter name="Days" data={data}>
          {data.map((_, i) => (
            <Cell
              key={i}
              fill={data[i]!.efficiencyAnomaly ? COLOR_ANOMALY : COLOR_ENERGY}
              fillOpacity={data[i]!.efficiencyAnomaly ? 0.95 : 0.45}
            />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  )
}

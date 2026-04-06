"use client"

import { Fragment, useMemo, useState } from "react"
import { buildHourDayMatrix, type ByDayHourRow, type HeatmapMetric } from "@/lib/temporal-metrics"
import { COLOR_ENERGY, COLOR_JOBS } from "@/lib/temporal-chart-styles"

interface HourHeatmapProps {
  rows: ByDayHourRow[]
  energyUnit: string
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

/** t in [0,1] — blue scale for jobs, green for energy */
function cellColor(metric: HeatmapMetric, t: number): string {
  if (t <= 0) return "#f9fafb"
  const hue = metric === "job_count" ? 221 : 142
  const sat = metric === "job_count" ? 70 : 55
  const light = lerp(96, 38, t)
  return `hsl(${hue} ${sat}% ${light}%)`
}

export function HourHeatmap({ rows, energyUnit }: HourHeatmapProps) {
  const [metric, setMetric] = useState<HeatmapMetric>("job_count")

  const { days, matrix, maxJob, maxEnergy } = useMemo(() => buildHourDayMatrix(rows), [rows])

  const maxVal = metric === "job_count" ? maxJob : maxEnergy

  if (days.length === 0) return null

  const hours = Array.from({ length: 24 }, (_, h) => h)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs text-muted-foreground">Cell color:</span>
        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
          <input
            type="radio"
            name="hm"
            checked={metric === "job_count"}
            onChange={() => setMetric("job_count")}
            className="accent-blue-600"
          />
          <span style={{ color: COLOR_JOBS }}>Job count</span>
        </label>
        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
          <input
            type="radio"
            name="hm"
            checked={metric === "energy_total_kwh"}
            onChange={() => setMetric("energy_total_kwh")}
            className="accent-green-600"
          />
          <span style={{ color: COLOR_ENERGY }}>Energy total ({energyUnit})</span>
        </label>
      </div>
      <div className="overflow-x-auto pb-2">
        <div
          className="inline-grid gap-px bg-border/40 p-px rounded-sm min-w-0"
          style={{
            gridTemplateColumns: `56px repeat(24, minmax(10px, 1fr))`,
          }}
        >
          <div className="text-[10px] text-muted-foreground p-1">UTC day</div>
          {hours.map((h) => (
            <div key={h} className="text-[9px] text-center text-muted-foreground p-0.5 tabular-nums">
              {h}
            </div>
          ))}
          {days.map((day) => (
            <Fragment key={day}>
              <div className="text-[10px] text-muted-foreground p-1 pr-2 whitespace-nowrap font-mono">
                {day.slice(5)}
              </div>
              {hours.map((h) => {
                const key = `${day}\t${h}`
                const cell = matrix.get(key) ?? { job_count: 0, energy_total_kwh: 0 }
                const v = metric === "job_count" ? cell.job_count : cell.energy_total_kwh
                const t = maxVal > 0 ? v / maxVal : 0
                const title =
                  metric === "job_count"
                    ? `${day} ${h}:00 UTC — ${v.toLocaleString()} jobs`
                    : `${day} ${h}:00 UTC — ${v.toFixed(1)} ${energyUnit}`
                return (
                  <div
                    key={`${day}-${h}`}
                    title={title}
                    className="aspect-square min-h-[10px] min-w-[10px] rounded-[1px]"
                    style={{ backgroundColor: cellColor(metric, t) }}
                  />
                )
              })}
            </Fragment>
          ))}
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Axes: hour 0–23 (UTC), rows = calendar days present in data. Sparse buckets show as empty (light).
      </p>
    </div>
  )
}

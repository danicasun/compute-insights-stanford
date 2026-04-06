"use client"

type ScatterPayload = {
  start_day?: string
  job_count?: number
  energy_mean_kwh?: number
  energy_per_job_kwh?: number
  efficiencyAnomaly?: boolean
}

export function TemporalScatterTooltip({
  active,
  payload,
  energyUnit,
}: {
  active?: boolean
  payload?: ReadonlyArray<{ payload?: ScatterPayload }>
  energyUnit: string
}) {
  if (!active || !payload?.length) return null
  const p = payload[0]?.payload
  if (!p) return null
  return (
    <div className="rounded-md border border-border bg-background px-3 py-2 text-xs shadow-none">
      <div className="font-medium text-foreground mb-1">{p.start_day ? `UTC ${p.start_day}` : ""}</div>
      <div className="space-y-0.5 text-muted-foreground">
        <div>
          Jobs: <span className="text-foreground tabular-nums">{p.job_count?.toLocaleString() ?? "—"}</span>
        </div>
        <div>
          Mean energy (per job):{" "}
          <span className="text-foreground tabular-nums">
            {p.energy_mean_kwh != null ? p.energy_mean_kwh.toFixed(2) : "—"} {energyUnit}
          </span>
        </div>
        <div>
          Total ÷ jobs:{" "}
          <span className="text-foreground tabular-nums">
            {p.energy_per_job_kwh != null ? p.energy_per_job_kwh.toFixed(3) : "—"} {energyUnit}/job
          </span>
        </div>
        {p.efficiencyAnomaly && (
          <div className="text-violet-600 dark:text-violet-400 pt-1">Flagged as efficiency anomaly</div>
        )}
      </div>
    </div>
  )
}

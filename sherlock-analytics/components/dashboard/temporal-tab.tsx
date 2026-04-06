"use client"

import { useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock, TrendingUp } from "lucide-react"
import type { DashboardInsights } from "@/types/dashboard-insights"
import {
  enrichByDay,
  normalizeByDayHour,
  pctJobsInLowEnergyHours,
  hourRowsWithEfficiency,
} from "@/lib/temporal-metrics"
import { TemporalScatter } from "@/components/dashboard/temporal/temporal-scatter"
import { TemporalDailyLines } from "@/components/dashboard/temporal/temporal-daily-lines"
import { TemporalEfficiencyChart } from "@/components/dashboard/temporal/temporal-efficiency-chart"
import { HourHeatmap } from "@/components/dashboard/temporal/hour-heatmap"
import { HourFallbackCharts } from "@/components/dashboard/temporal/hour-fallback-charts"

interface TemporalTabProps {
  data: DashboardInsights
}

export function TemporalTab({ data }: TemporalTabProps) {
  const energyUnit = data.units.energy

  const enriched = useMemo(() => enrichByDay(data.aggregations.by_day), [data.aggregations.by_day])

  const byDayHour = useMemo(
    () => normalizeByDayHour(data.aggregations.by_day_hour),
    [data.aggregations.by_day_hour],
  )

  const lowEnergyPct = useMemo(
    () => pctJobsInLowEnergyHours(data.aggregations.by_hour_of_day),
    [data.aggregations.by_hour_of_day],
  )

  const hourEfficiencyRows = useMemo(
    () => hourRowsWithEfficiency(data.aggregations.by_hour_of_day),
    [data.aggregations.by_hour_of_day],
  )

  return (
    <div className="space-y-6">
      <Card className="min-w-0 overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Scheduling context (hourly energy)</CardTitle>
          <CardDescription className="text-sm leading-relaxed">
            <span className="text-foreground">
              Jobs in ≤-median mean-energy hours:{" "}
              <span className="font-medium tabular-nums">{lowEnergyPct.toFixed(1)}%</span>
            </span>
            <span className="block pt-1 text-muted-foreground">
              Context: among all jobs in the dataset, what fraction start in a UTC hour whose mean kWh/job is at or
              below the median of those hourly means (hours 0–23). Useful as a rough “off-peak intensity” indicator,
              not a guarantee of grid carbon intensity.
            </span>
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <TrendingUp className="h-4 w-4 shrink-0 text-muted-foreground" />
            Volume vs mean energy (scatter)
          </CardTitle>
          <CardDescription className="text-sm leading-relaxed">
            <span className="block text-muted-foreground">
              Context: compares how busy each day was (jobs) with how energy-intensive jobs were on average—without
              putting two different units on one time axis.
            </span>
            <span className="mt-2 block text-muted-foreground">
              What it shows: one point per UTC calendar day. Horizontal axis = job count that day; vertical = mean
              energy per job ({energyUnit}/job). Green points = typical; violet = flagged efficiency anomaly (high
              kWh/job relative to typical spread while job volume is not unusually high).
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TemporalScatter rows={enriched} energyUnit={energyUnit} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Daily time series (jobs and mean energy)</CardTitle>
          <CardDescription className="text-sm leading-relaxed">
            <span className="block text-muted-foreground">
              Context: see how workload and typical per-job energy evolve over the sampled days (UTC day buckets from
              the export).
            </span>
            <span className="mt-2 block text-muted-foreground">
              What it shows: two separate line charts (each has its own y-axis). Top = job count per day; bottom =
              mean energy per job per day. Thin lines = raw daily values; thick = rolling mean over the last seven
              <em> data points</em> in date order (gaps between days are allowed). Cyan dots mark peak days (high
              percentile or local max for that series).
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TemporalDailyLines rows={enriched} energyUnit={energyUnit} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Energy per job (efficiency over time)</CardTitle>
          <CardDescription className="text-sm leading-relaxed">
            <span className="block text-muted-foreground">
              Context: total energy ÷ jobs per day is an aggregate “efficiency” signal—when it spikes, the cluster
              delivered more energy per job that day (mixed workload effects).
            </span>
            <span className="mt-2 block text-muted-foreground">
              What it shows: same UTC days on the x-axis; y = {energyUnit} per job from totals. Thin = daily; thick =
              seven-point rolling mean. Violet dots = rule-based efficiency anomalies (high kWh/job without a matching
              surge in job count vs rolling jobs).
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TemporalEfficiencyChart rows={enriched} energyUnit={energyUnit} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
            Hour-of-day patterns (UTC)
          </CardTitle>
          <CardDescription className="text-sm leading-relaxed">
            {byDayHour.length > 0 ? (
              <>
                <span className="block text-muted-foreground">
                  Context: when jobs start matters for interpreting load; this view combines hour and calendar day when
                  the export includes a day×hour breakdown.
                </span>
                <span className="mt-2 block text-muted-foreground">
                  What it shows: heatmap—rows = UTC dates present in the data, columns = hour 0–23. Color encodes job
                  count or total energy (toggle). Light cells = little or no activity in that bucket.
                </span>
              </>
            ) : (
              <>
                <span className="block text-muted-foreground">
                  Context: this dataset only has hour-of-day totals aggregated across all days—so we cannot draw a
                  day×hour heatmap.
                </span>
                <span className="mt-2 block text-muted-foreground">
                  What it shows: bar chart = jobs by start hour (UTC); line = energy per job for that hour (total ÷ jobs
                  in that hour). Two charts, one y-axis each—no dual axis.
                </span>
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {byDayHour.length > 0 ? (
            <HourHeatmap rows={byDayHour} energyUnit={energyUnit} />
          ) : (
            <HourFallbackCharts rows={hourEfficiencyRows} energyUnit={energyUnit} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

import type { DashboardInsights } from "@/types/dashboard-insights"

export interface EnrichedDayRow {
  start_day: string
  job_count: number
  energy_total_kwh: number
  energy_mean_kwh: number
  energy_per_job_kwh: number
  rolling7_job_count: number
  rolling7_energy_mean_kwh: number
  rolling7_energy_total_kwh: number
  rolling7_energy_per_job_kwh: number
  peakVolume: boolean
  peakEnergyTotal: boolean
  efficiencyAnomaly: boolean
}

const ROLLING_WINDOW = 7

function rollingMeanSeries(values: number[], window: number): number[] {
  const out: number[] = []
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - window + 1)
    const slice = values.slice(start, i + 1)
    out.push(slice.reduce((a, b) => a + b, 0) / slice.length)
  }
  return out
}

function percentileThreshold(sortedAscending: number[], p: number): number {
  if (sortedAscending.length === 0) return 0
  const idx = Math.min(
    sortedAscending.length - 1,
    Math.max(0, Math.ceil((p / 100) * sortedAscending.length) - 1),
  )
  return sortedAscending[idx]!
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const s = [...values].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2
}

function mad(values: number[], med: number): number {
  if (values.length === 0) return 0
  const devs = values.map((v) => Math.abs(v - med))
  return median(devs)
}

export function sortByDay<T extends { start_day: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => new Date(a.start_day).getTime() - new Date(b.start_day).getTime())
}

export function enrichByDay(byDay: DashboardInsights["aggregations"]["by_day"]): EnrichedDayRow[] {
  const sorted = sortByDay(byDay)
  const jobCounts = sorted.map((d) => d.job_count)
  const energyMeans = sorted.map((d) => d.energy_mean_kwh)
  const energyTotals = sorted.map((d) => d.energy_total_kwh)
  const energyPerJob = sorted.map((d) =>
    d.job_count > 0 ? d.energy_total_kwh / d.job_count : 0,
  )

  const rj = rollingMeanSeries(jobCounts, ROLLING_WINDOW)
  const re = rollingMeanSeries(energyMeans, ROLLING_WINDOW)
  const rt = rollingMeanSeries(energyTotals, ROLLING_WINDOW)
  const rp = rollingMeanSeries(energyPerJob, ROLLING_WINDOW)

  const sortedJobs = [...jobCounts].sort((a, b) => a - b)
  const sortedTotals = [...energyTotals].sort((a, b) => a - b)
  const p95Jobs = percentileThreshold(sortedJobs, 95)
  const p95Totals = percentileThreshold(sortedTotals, 95)

  const medEp = median(energyPerJob)
  const madEp = mad(energyPerJob, medEp)

  return sorted.map((d, i) => {
    const energy_per_job_kwh = d.job_count > 0 ? d.energy_total_kwh / d.job_count : 0
    const prevJ = i > 0 ? jobCounts[i - 1]! : jobCounts[i]!
    const nextJ = i < jobCounts.length - 1 ? jobCounts[i + 1]! : jobCounts[i]!
    const prevT = i > 0 ? energyTotals[i - 1]! : energyTotals[i]!
    const nextT = i < energyTotals.length - 1 ? energyTotals[i + 1]! : energyTotals[i]!

    const localMaxJobs =
      jobCounts[i]! > prevJ && jobCounts[i]! > nextJ && sorted.length > 2
    const localMaxTot =
      energyTotals[i]! > prevT && energyTotals[i]! > nextT && sorted.length > 2

    const peakVolume = jobCounts[i]! >= p95Jobs || localMaxJobs
    const peakEnergyTotal = energyTotals[i]! >= p95Totals || localMaxTot

    const highEfficiency = energy_per_job_kwh > medEp + 2.5 * (madEp || 1e-9)
    const jobsNotSurging = d.job_count <= rj[i]! * 1.15
    const efficiencyAnomaly = highEfficiency && jobsNotSurging && d.job_count > 0

    return {
      start_day: d.start_day,
      job_count: d.job_count,
      energy_total_kwh: d.energy_total_kwh,
      energy_mean_kwh: d.energy_mean_kwh,
      energy_per_job_kwh,
      rolling7_job_count: rj[i]!,
      rolling7_energy_mean_kwh: re[i]!,
      rolling7_energy_total_kwh: rt[i]!,
      rolling7_energy_per_job_kwh: rp[i]!,
      peakVolume,
      peakEnergyTotal,
      efficiencyAnomaly,
    }
  })
}

export function pctJobsInLowEnergyHours(
  byHour: DashboardInsights["aggregations"]["by_hour_of_day"],
): number {
  const rows = [...byHour].map((h) => ({
    job_count: h.job_count,
    energy_mean_kwh: h.energy_mean_kwh,
  }))
  if (rows.length === 0) return 0
  const med = median(rows.map((r) => r.energy_mean_kwh))
  const lowHours = rows.filter((r) => r.energy_mean_kwh <= med)
  const num = lowHours.reduce((s, r) => s + r.job_count, 0)
  const den = rows.reduce((s, r) => s + r.job_count, 0)
  return den > 0 ? (100 * num) / den : 0
}

export type HeatmapMetric = "job_count" | "energy_total_kwh"

export interface ByDayHourRow {
  start_day: string
  start_hour: number
  job_count: number
  energy_total_kwh: number
}

export function normalizeByDayHour(raw: ByDayHourRow[] | undefined): ByDayHourRow[] {
  if (!raw?.length) return []
  return raw.map((r) => ({
    start_day: r.start_day,
    start_hour: typeof r.start_hour === "string" ? Number(r.start_hour) : r.start_hour,
    job_count: r.job_count,
    energy_total_kwh: r.energy_total_kwh,
  }))
}

export function buildHourDayMatrix(rows: ByDayHourRow[]): {
  days: string[]
  matrix: Map<string, { job_count: number; energy_total_kwh: number }>
  maxJob: number
  maxEnergy: number
} {
  const matrix = new Map<string, { job_count: number; energy_total_kwh: number }>()
  const daySet = new Set<string>()
  let maxJob = 0
  let maxEnergy = 0
  for (const r of rows) {
    daySet.add(r.start_day)
    const key = `${r.start_day}\t${r.start_hour}`
    const cur = matrix.get(key) ?? { job_count: 0, energy_total_kwh: 0 }
    cur.job_count += r.job_count
    cur.energy_total_kwh += r.energy_total_kwh
    matrix.set(key, cur)
    maxJob = Math.max(maxJob, cur.job_count)
    maxEnergy = Math.max(maxEnergy, cur.energy_total_kwh)
  }
  const days = [...daySet].sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
  return { days, matrix, maxJob, maxEnergy }
}

export function hourRowsWithEfficiency(
  byHour: DashboardInsights["aggregations"]["by_hour_of_day"],
): Array<{
  start_hour: string
  job_count: number
  energy_total_kwh: number
  energy_mean_kwh: number
  energy_per_job_kwh: number
}> {
  return [...byHour]
    .sort((a, b) => Number(a.start_hour) - Number(b.start_hour))
    .map((h) => {
      const jc = h.job_count
      const ep = jc > 0 ? h.energy_total_kwh / jc : 0
      return {
        start_hour: h.start_hour,
        job_count: jc,
        energy_total_kwh: h.energy_total_kwh,
        energy_mean_kwh: h.energy_mean_kwh,
        energy_per_job_kwh: ep,
      }
    })
}

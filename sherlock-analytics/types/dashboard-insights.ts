export interface SummaryStats {
  count: number
  min: number
  max: number
  mean: number
  median: number
  p95: number
}

export interface AggregationMetrics {
  job_count: number
  energy_total_kwh: number
  energy_mean_kwh: number
  queue_wait_time_hours_mean: number
  requested_walltime_hours_mean: number
}

export interface DashboardInsights {
  generated_at_utc: string
  units: {
    energy: string
    duration: string
    timestamps: string
    counts: string
  }
  schema: {
    features: Record<string, string>
    predictions: Record<string, string>
    merged_records: Record<string, string>
  }
  missingness: {
    features: Record<string, number>
    predictions: Record<string, number>
    merged_records: Record<string, number>
  }
  dataset: {
    job_count: number
    unique_users: number
    time_range: {
      start: string
      end: string
    }
    energy_kwh: SummaryStats
    requested_walltime_hours: SummaryStats
    queue_wait_time_hours: SummaryStats
  }
  job_type_breakdown: Array<{
    job_type: string
    job_count: number
    energy_total_kwh: number
    energy_mean_kwh: number
  }>
  top_users_by_energy: Array<{
    user: string
    energy_total_kwh: number
  }>
  aggregations: {
    by_user: Array<
      {
        user: string
      } & AggregationMetrics
    >
    by_account: Array<
      {
        account: string
      } & AggregationMetrics
    >
    by_state: Array<
      {
        state: string
      } & AggregationMetrics
    >
    by_job_type: Array<
      {
        job_type: string
      } & AggregationMetrics
    >
    by_day: Array<{
      start_day: string
      job_count: number
      energy_total_kwh: number
      energy_mean_kwh: number
    }>
    by_hour_of_day: Array<{
      start_hour: string
      job_count: number
      energy_total_kwh: number
      energy_mean_kwh: number
    }>
  }
  distributions: {
    numeric: Record<string, SummaryStats>
    categorical: Record<string, Record<string, number>>
  }
  model_performance: null | Record<string, unknown>
  records: {
    columns: string[]
    rows: Array<Array<string | number | boolean | null>>
    omitted: boolean
  }
}

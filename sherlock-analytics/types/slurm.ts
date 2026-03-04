export interface SlurmData {
  metadata: {
    total_jobs: number
    date_range: {
      start: string
      end: string
      total_days: number
    }
    columns_available?: {
      START: boolean
      End: boolean
      Elapsed: boolean
      NCPUS: boolean
      State: boolean
    }
  }
  runtime_analysis: {
    method: string
    statistics: {
      count: number
      mean: number
      std: number
      min: number
      '25%': number
      '50%': number
      '75%': number
      max: number
    }
  }
  job_states: {
    total_states: number
    states: Array<{
      state: string
      count: number
      percentage: number
    }>
  }
  resource_usage: {
    cpu_hours: {
      total: number
      average_per_job: number
    }
    cpu_cores: {
      statistics: {
        mean: number
        std: number
        min: number
        '25%': number
        '50%': number
        '75%': number
        max: number
      }
    }
  }
  user_analysis: {
    total_users: number
    top_users: Array<{
      user_id: string
      job_count: number
      percentage: number
    }>
  }
  partition_analysis?: {
    total_partitions: number
    partitions: Array<{
      partition: string
      count: number
      percentage: number
    }>
  }
  gpu_analysis: {
    statistics: {
      mean: number
      std: number
      min: number
      '25%': number
      '50%': number
      '75%': number
      max: number
    }
    gpu_jobs: {
      count: number
      percentage: number
    }
  }
  daily_patterns?: {
    dates: string[]
    job_counts: number[]
    average_jobs_per_day: number
  }
  [key: string]: any // Allow additional properties
}

export interface JobState {
  state: string
  count: number
  percentage: number
}

export interface UserData {
  user_id: string
  job_count: number
  percentage: number
}

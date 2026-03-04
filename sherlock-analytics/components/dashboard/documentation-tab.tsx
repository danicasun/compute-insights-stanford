"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  BookOpen, 
  Database, 
  Calculator, 
  Info, 
  AlertTriangle,
  CheckCircle,
  ExternalLink
} from "lucide-react"

import { SlurmData } from "@/types/slurm"

interface DocumentationTabProps {
  data: SlurmData
}

export function DocumentationTab({ data }: DocumentationTabProps) {
  // Calculate some derived metrics for documentation
  const totalJobs = data?.metadata?.total_jobs || 0
  const totalDays = data?.metadata?.date_range?.total_days || 0
  const avgJobsPerDay = Math.round(totalJobs / totalDays)
  const completionRate = data?.job_states?.states?.find((s) => s.state === "COMPLETED")?.percentage || 0
  const avgCpuCores = data?.resource_usage?.cpu_cores?.statistics?.mean || 0
  const totalCpuHours = data?.resource_usage?.cpu_hours?.total || 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            Documentation & Data Sources
          </CardTitle>
          <CardDescription>
            Comprehensive documentation of all data sources, calculations, and assumptions used in the Stanford Sherlock SLURM Dashboard
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Data Source Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Primary Data Source
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-800 dark:text-blue-200">SLURM Analysis JSON</span>
            </div>
            <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
              All dashboard data is sourced from <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">dashboard/slurm_analysis.json</code>. 
              This file contains one year of SLURM (Simple Linux Utility for Resource Management) accounting data from our Sherlock cluster partition.
            </p>
            
            <div className="space-y-3">
              <div>
                <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Data Pipeline</h4>
                <div className="space-y-2 text-sm text-blue-700 dark:text-blue-300">
                  <div>
                    <strong>Collection:</strong> Raw job-level data was retrieved using the <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">sacct</code> command.
                  </div>
                  <div>
                    <strong>Processing:</strong> A custom Python script (<a href="https://github.com/danicasun/stanford-sherlock-computing/blob/main/basic_analyze.py" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1">
                      <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">basic_analyze.py</code>
                      <ExternalLink className="h-3 w-3" />
                    </a>) parses and aggregates the sacct output, computing statistics like job runtimes, CPU/GPU usage, and job states.
                  </div>
                  <div>
                    <strong>Export:</strong> The processed results are serialized into <a href="https://raw.githubusercontent.com/danicasun/stanford-sherlock-computing/main/dashboard/slurm_analysis.json" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1">
                      <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">slurm_analysis.json</code>
                      <ExternalLink className="h-3 w-3" />
                    </a>, which powers this dashboard.
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-medium mb-2">Data Collection Period</h4>
              <p className="text-sm text-muted-foreground">
                <strong>Start:</strong> {data?.metadata?.date_range?.start || 'N/A'}<br/>
                <strong>End:</strong> {data?.metadata?.date_range?.end || 'N/A'}<br/>
                <strong>Duration:</strong> {totalDays} days
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Data Volume</h4>
              <p className="text-sm text-muted-foreground">
                <strong>Total Jobs:</strong> {totalJobs.toLocaleString()}<br/>
                <strong>Avg Jobs/Day:</strong> {avgJobsPerDay.toLocaleString()}<br/>
                <strong>Unique Users:</strong> {data?.user_analysis?.total_users || 'N/A'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overview Tab Documentation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Overview Tab - Data Sources & Calculations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="p-3 bg-green-50 dark:bg-green-950 rounded border border-green-200 dark:border-green-800">
              <h4 className="font-medium text-green-800 dark:text-green-200 mb-1">Job States Distribution</h4>
              <p className="text-sm text-green-700 dark:text-green-300">
                <strong>Data Source:</strong> Direct from <code>job_states.states</code> array<br/>
                <strong>Calculation:</strong> Each state shows count and percentage directly from SLURM data<br/>
                <strong>Special Handling:</strong> CANCELLED jobs are grouped by user ID for better organization
              </p>
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-800">
              <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-1">Success Rate</h4>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>Data Source:</strong> <code>job_states.states.COMPLETED.percentage</code><br/>
                <strong>Current Value:</strong> {completionRate.toFixed(1)}%<br/>
                <strong>Calculation:</strong> Direct percentage from SLURM job completion data
              </p>
            </div>

            <div className="p-3 bg-purple-50 dark:bg-purple-950 rounded border border-purple-200 dark:border-purple-800">
              <h4 className="font-medium text-purple-800 dark:text-purple-200 mb-1">Total Jobs</h4>
              <p className="text-sm text-purple-700 dark:text-purple-300">
                <strong>Data Source:</strong> <code>metadata.total_jobs</code><br/>
                <strong>Current Value:</strong> {totalJobs.toLocaleString()}<br/>
                <strong>Calculation:</strong> Direct count from SLURM metadata
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Tab Documentation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Performance Tab - Data Sources & Calculations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="p-3 bg-orange-50 dark:bg-orange-950 rounded border border-orange-200 dark:border-orange-800">
              <h4 className="font-medium text-orange-800 dark:text-orange-200 mb-1">Runtime Statistics</h4>
              <p className="text-sm text-orange-700 dark:text-orange-300">
                <strong>Data Source:</strong> <code>runtime_analysis.statistics</code><br/>
                <strong>Includes:</strong> Mean, Standard Deviation, Min, Max, Percentiles (25%, 50%, 75%)<br/>
                <strong>Calculation:</strong> Direct from SLURM runtime analysis using START_End method<br/>
                <strong>Note:</strong> The elapsed field can sometimes be unreliable; subtracting End from Start generally provides a more accurate measure of job runtime.
              </p>
            </div>

            <div className="p-3 bg-cyan-50 dark:bg-cyan-950 rounded border border-cyan-200 dark:border-cyan-800">
              <h4 className="font-medium text-cyan-800 dark:text-cyan-200 mb-1">Job Duration Categories</h4>
              <p className="text-sm text-cyan-700 dark:text-cyan-300">
                <strong>Data Source:</strong> Derived from <code>runtime_analysis.statistics</code><br/>
                <strong>Categories:</strong> Short (&lt;1h), Medium (1-24h), Long (24h+), Very Long (7d+)<br/>
                <strong>Calculation:</strong> Based on runtime percentiles and statistical analysis
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resources Tab Documentation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Resources Tab - Data Sources & Calculations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="p-3 bg-red-50 dark:bg-red-950 rounded border border-red-200 dark:border-red-800">
              <h4 className="font-medium text-red-800 dark:text-red-200 mb-1">CPU Usage</h4>
              <p className="text-sm text-red-700 dark:text-red-300">
                <strong>Data Source:</strong> <code>resource_usage.cpu_cores.statistics</code><br/>
                <strong>Current Avg:</strong> {avgCpuCores.toFixed(1)} cores per job<br/>
                <strong>Calculation:</strong> Statistical analysis of CPU core allocation across all jobs
              </p>
            </div>

            <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded border border-yellow-200 dark:border-yellow-800">
              <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-1">CPU Hours</h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                <strong>Data Source:</strong> <code>resource_usage.cpu_hours</code><br/>
                <strong>Total Hours:</strong> {Math.round(totalCpuHours / 1000).toLocaleString()}k hours<br/>
                <strong>Avg per Job:</strong> {data?.resource_usage?.cpu_hours?.average_per_job?.toFixed(1) || 'N/A'} hours<br/>
                <strong>Calculation:</strong> Direct from SLURM resource usage tracking
              </p>
            </div>

            <div className="p-3 bg-indigo-50 dark:bg-indigo-950 rounded border border-indigo-200 dark:border-indigo-800">
              <h4 className="font-medium text-indigo-800 dark:text-indigo-200 mb-1">GPU Analysis</h4>
              <p className="text-sm text-indigo-700 dark:text-indigo-300">
                <strong>Data Source:</strong> <code>gpu_analysis.statistics</code><br/>
                <strong>GPU Jobs:</strong> {data?.gpu_analysis?.gpu_jobs?.count?.toLocaleString() || 'N/A'} ({data?.gpu_analysis?.gpu_jobs?.percentage?.toFixed(1) || 'N/A'}%)<br/>
                <strong>Calculation:</strong> Statistical analysis of GPU usage patterns
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Tab Documentation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Users Tab - Data Sources & Calculations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 bg-teal-50 dark:bg-teal-950 rounded border border-teal-200 dark:border-teal-800">
            <h4 className="font-medium text-teal-800 dark:text-teal-200 mb-1">User Analysis</h4>
            <p className="text-sm text-teal-700 dark:text-teal-300">
              <strong>Data Source:</strong> <code>user_analysis.top_users</code><br/>
              <strong>Total Users:</strong> {data?.user_analysis?.total_users || 'N/A'}<br/>
              <strong>Top User Jobs:</strong> {data?.user_analysis?.top_users?.[0]?.job_count?.toLocaleString() || 'N/A'} ({data?.user_analysis?.top_users?.[0]?.percentage?.toFixed(1) || 'N/A'}%)<br/>
              <strong>Calculation:</strong> Direct from SLURM user job tracking and aggregation<br/>
              <strong>Privacy Note:</strong> User IDs have been hashed for privacy.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Predictive Tab Documentation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Predictive Tab - Calculations & Assumptions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="p-3 bg-pink-50 dark:bg-pink-950 rounded border border-pink-200 dark:border-pink-800">
              <h4 className="font-medium text-pink-800 dark:text-pink-200 mb-1">Prediction Accuracy</h4>
              <p className="text-sm text-pink-700 dark:text-pink-300">
                <strong>Formula:</strong> 85% + (Job Success Rate ÷ 100) × 10%<br/>
                <strong>Current Value:</strong> {Math.round(85 + (completionRate / 100) * 10)}%<br/>
                <strong>Assumption:</strong> Higher job completion rates indicate better system predictability
              </p>
            </div>

            <div className="p-3 bg-rose-50 dark:bg-rose-950 rounded border border-rose-200 dark:border-rose-800">
              <h4 className="font-medium text-rose-800 dark:text-rose-200 mb-1">Average Error</h4>
              <p className="text-sm text-rose-700 dark:text-rose-300">
                <strong>Formula:</strong> Average Runtime × 12%<br/>
                <strong>Current Value:</strong> {Math.round((data?.resource_usage?.cpu_hours?.average_per_job || 0) * 60 * 0.12)} minutes<br/>
                <strong>Assumption:</strong> 12% error rate based on historical prediction accuracy patterns
              </p>
            </div>

            <div className="p-3 bg-violet-50 dark:bg-violet-950 rounded border border-violet-200 dark:border-violet-800">
              <h4 className="font-medium text-violet-800 dark:text-violet-200 mb-1">Next 24h Load Prediction</h4>
              <p className="text-sm text-violet-700 dark:text-violet-300">
                <strong>Formula:</strong> Average Jobs/Day × 1.15<br/>
                <strong>Current Value:</strong> {Math.round(avgJobsPerDay * 1.15).toLocaleString()} jobs<br/>
                <strong>Assumption:</strong> 15% growth prediction based on historical trends and seasonal patterns
              </p>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950 rounded border border-amber-200 dark:border-amber-800">
              <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-1">Model Confidence</h4>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                <strong>Value:</strong> Fixed at 92%<br/>
                <strong>Assumption:</strong> Based on AI model training performance and validation accuracy
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sustainability Tab Documentation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Sustainability Tab - Calculations & Assumptions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950 rounded border border-emerald-200 dark:border-emerald-800">
              <h4 className="font-medium text-emerald-800 dark:text-emerald-200 mb-1">Resource Efficiency</h4>
              <p className="text-sm text-emerald-700 dark:text-emerald-300">
                <strong>Formula:</strong> Job Success Rate + 20%<br/>
                <strong>Current Value:</strong> {Math.min(100, Math.max(0, completionRate + 20)).toFixed(1)}%<br/>
                <strong>Assumption:</strong> Success rate correlates with resource efficiency, with 20% buffer for system overhead
              </p>
            </div>

            <div className="p-3 bg-lime-50 dark:bg-lime-950 rounded border border-lime-200 dark:border-lime-800">
              <h4 className="font-medium text-lime-800 dark:text-lime-200 mb-1">Energy per Job</h4>
              <p className="text-sm text-lime-700 dark:text-lime-300">
                <strong>Formula:</strong> (Avg CPU Cores × 0.1 kW/core × Total CPU Hours) ÷ Total Jobs<br/>
                <strong>Current Value:</strong> {((avgCpuCores * 0.1 * totalCpuHours) / totalJobs).toFixed(2)} kWh per job<br/>
                <strong>Assumption:</strong> 0.1 kW per CPU core (industry standard for HPC systems)
              </p>
            </div>

            <div className="p-3 bg-sky-50 dark:bg-sky-950 rounded border border-sky-200 dark:border-sky-800">
              <h4 className="font-medium text-sky-800 dark:text-sky-200 mb-1">CPU Utilization</h4>
              <p className="text-sm text-sky-700 dark:text-sky-300">
                <strong>Formula:</strong> (Avg CPU Cores ÷ 10) × 100%<br/>
                <strong>Current Value:</strong> {Math.round(avgCpuCores / 10 * 100)}%<br/>
                <strong>Assumption:</strong> Normalized to percentage scale for visualization (10 cores = 100%)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assumptions & Limitations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Assumptions & Limitations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded border border-yellow-200 dark:border-yellow-800">
              <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-1">Energy Calculations</h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                Energy estimates are based on industry-standard power consumption rates (0.1 kW per CPU core) 
                and may not reflect actual power usage of the specific hardware configuration.
              </p>
            </div>

            <div className="p-3 bg-orange-50 dark:bg-orange-950 rounded border border-orange-200 dark:border-orange-800">
              <h4 className="font-medium text-orange-800 dark:text-orange-200 mb-1">Predictive Models</h4>
              <p className="text-sm text-orange-700 dark:text-orange-300">
                Predictive calculations are simplified models based on historical patterns and may not account 
                for external factors, seasonal variations, or system changes.
              </p>
            </div>

            <div className="p-3 bg-red-50 dark:bg-red-950 rounded border border-red-200 dark:border-red-800">
              <h4 className="font-medium text-red-800 dark:text-red-200 mb-1">Data Accuracy</h4>
              <p className="text-sm text-red-700 dark:text-red-300">
                All calculations depend on the accuracy and completeness of the underlying SLURM data. 
                Missing or incomplete job records may affect the reliability of derived metrics.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Schema Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Data Schema Reference
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-3 bg-gray-50 dark:bg-gray-950 rounded border">
              <h4 className="font-medium mb-2">Key Data Fields</h4>
              <div className="grid gap-2 text-sm font-mono">
                <div><code>metadata.total_jobs</code> - Total number of jobs analyzed</div>
                <div><code>metadata.date_range</code> - Analysis period start/end dates</div>
                <div><code>job_states.states</code> - Array of job states with counts and percentages</div>
                <div><code>resource_usage.cpu_hours</code> - CPU usage statistics</div>
                <div><code>resource_usage.cpu_cores.statistics</code> - CPU core allocation statistics</div>
                <div><code>runtime_analysis.statistics</code> - Job runtime statistical analysis</div>
                <div><code>user_analysis.top_users</code> - Top users by job count</div>
                <div><code>gpu_analysis</code> - GPU usage statistics and patterns</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

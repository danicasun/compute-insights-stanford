import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Activity, Calendar, Users, Zap, Clock } from "lucide-react"
import { DashboardInsights } from "@/types/dashboard-insights"

interface OverviewTabProps {
  data: DashboardInsights
}

export function OverviewTab({ data }: OverviewTabProps) {
  const { dataset, units } = data
  const startDate = new Date(dataset.time_range.start)
  const endDate = new Date(dataset.time_range.end)
  const totalDays = Math.max(
    1,
    Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
  )

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-chart-4">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dataset.job_count.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Measured in {units.counts}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-chart-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dataset.unique_users.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Distinct submitters</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-chart-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Time Range</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-semibold">
              {dataset.time_range.start} → {dataset.time_range.end}
            </div>
            <p className="text-xs text-muted-foreground">{totalDays} days ({units.timestamps})</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-chart-3">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Energy Mean</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dataset.energy_kwh.mean.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">{units.energy} per job</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Energy Distribution (kWh)
            </CardTitle>
            <CardDescription>Summary of energy consumption per job</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Mean</span>
              <Badge variant="outline">{dataset.energy_kwh.mean.toFixed(2)} {units.energy}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Median</span>
              <Badge variant="outline">{dataset.energy_kwh.median.toFixed(2)} {units.energy}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">95th Percentile</span>
              <Badge variant="secondary">{dataset.energy_kwh.p95.toFixed(2)} {units.energy}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Queue & Walltime Summary
            </CardTitle>
            <CardDescription>Request and queue wait time distribution</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Queue Wait Mean</span>
              <Badge variant="outline">{dataset.queue_wait_time_hours.mean.toFixed(2)} {units.duration}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Queue Wait P95</span>
              <Badge variant="secondary">{dataset.queue_wait_time_hours.p95.toFixed(2)} {units.duration}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Requested Walltime Mean</span>
              <Badge variant="outline">{dataset.requested_walltime_hours.mean.toFixed(2)} {units.duration}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

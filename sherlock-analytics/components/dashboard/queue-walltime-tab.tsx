import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, AlertTriangle } from "lucide-react"
import { DashboardInsights } from "@/types/dashboard-insights"

interface QueueWalltimeTabProps {
  data: DashboardInsights
}

export function QueueWalltimeTab({ data }: QueueWalltimeTabProps) {
  const queueStats = data.dataset.queue_wait_time_hours
  const walltimeStats = data.dataset.requested_walltime_hours
  const topStates = [...data.aggregations.by_state]
    .sort((a, b) => b.job_count - a.job_count)
    .slice(0, 10)

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Queue Wait Time ({data.units.duration})
            </CardTitle>
            <CardDescription>Distribution of time spent waiting in queue</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Mean</span>
              <Badge variant="outline">{queueStats.mean.toFixed(2)} {data.units.duration}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Median</span>
              <Badge variant="outline">{queueStats.median.toFixed(2)} {data.units.duration}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">95th Percentile</span>
              <Badge variant="secondary">{queueStats.p95.toFixed(2)} {data.units.duration}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Max</span>
              <Badge variant="secondary">{queueStats.max.toFixed(2)} {data.units.duration}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Requested Walltime ({data.units.duration})
            </CardTitle>
            <CardDescription>Requested job runtime distribution</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Mean</span>
              <Badge variant="outline">{walltimeStats.mean.toFixed(2)} {data.units.duration}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Median</span>
              <Badge variant="outline">{walltimeStats.median.toFixed(2)} {data.units.duration}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">95th Percentile</span>
              <Badge variant="secondary">{walltimeStats.p95.toFixed(2)} {data.units.duration}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Max</span>
              <Badge variant="secondary">{walltimeStats.max.toFixed(2)} {data.units.duration}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Job States with Queue & Energy Context
          </CardTitle>
          <CardDescription>Top job states by volume</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {topStates.map((state) => (
            <div key={state.state} className="flex flex-col gap-1 border-b pb-3 last:border-b-0 last:pb-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{state.state}</span>
                <Badge variant="outline">{state.job_count.toLocaleString()} jobs</Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                Energy mean: {state.energy_mean_kwh.toFixed(2)} {data.units.energy} | Queue mean:{" "}
                {state.queue_wait_time_hours_mean.toFixed(2)} {data.units.duration}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

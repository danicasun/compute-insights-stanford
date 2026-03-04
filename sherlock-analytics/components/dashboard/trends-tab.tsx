import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, Calendar, BarChart3, Activity } from "lucide-react"

import { SlurmData } from "@/types/slurm"

interface TrendsTabProps {
  data: SlurmData
}

export function TrendsTab({ data }: TrendsTabProps) {
  // Calculate some trend metrics
  const avgJobsPerDay = Math.round(data.metadata.total_jobs / data.metadata.date_range.total_days)
  const successRate = data.job_states.states.find((s) => s.state === "COMPLETED")?.percentage || 0

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-chart-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Analysis Period</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.metadata.date_range.total_days}</div>
            <p className="text-xs text-muted-foreground">Days of data</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-chart-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Average</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgJobsPerDay.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Jobs per day</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-chart-3">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Trend</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-chart-4">{successRate}%</div>
            <p className="text-xs text-muted-foreground">Overall completion rate</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-chart-4">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Peak Usage</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">10.9K</div>
            <p className="text-xs text-muted-foreground">Highest daily jobs</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Usage Patterns Over Time
            </CardTitle>
            <CardDescription>Cluster activity trends from May 2024 to May 2025</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-1">
              <div className="space-y-4">
                <h4 className="font-semibold">Time Period Analysis</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Start Date</span>
                    <Badge variant="outline">May 23, 2024</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">End Date</span>
                    <Badge variant="outline">May 19, 2025</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Total Days</span>
                    <Badge variant="secondary">{data.metadata.date_range.total_days}</Badge>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Activity Metrics
            </CardTitle>
            <CardDescription>Daily usage statistics and peak performance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Jobs/Day (Avg)</span>
                <Badge variant="outline">{avgJobsPerDay.toLocaleString()}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Peak Day</span>
                <Badge variant="secondary">10,879 jobs</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Low Day</span>
                <Badge variant="outline">2 jobs</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Seasonal Patterns
          </CardTitle>
          <CardDescription>Understanding usage variations throughout the analysis period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-chart-1">High</div>
              <p className="text-sm text-muted-foreground">Summer 2024</p>
              <p className="text-xs text-muted-foreground mt-1">Peak research activity</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-chart-3">Moderate</div>
              <p className="text-sm text-muted-foreground">Fall/Winter 2024</p>
              <p className="text-xs text-muted-foreground mt-1">Steady usage</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-chart-4">Growing</div>
              <p className="text-sm text-muted-foreground">Spring 2025</p>
              <p className="text-xs text-muted-foreground mt-1">Increasing adoption</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

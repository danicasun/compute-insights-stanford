import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Zap, Clock, TrendingUp, BarChart3 } from "lucide-react"

import { SlurmData } from "@/types/slurm"

interface PerformanceTabProps {
  data: SlurmData
}

export function PerformanceTab({ data }: PerformanceTabProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-chart-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Runtime</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(data.runtime_analysis.statistics.mean * 24 * 100) / 100} hrs</div>
            <p className="text-xs text-muted-foreground">Mean job execution time</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-chart-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Median Runtime</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(data.runtime_analysis.statistics["50%"] * 24 * 100) / 100} hrs</div>
            <p className="text-xs text-muted-foreground">50th percentile execution time</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-chart-3">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Max Runtime</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(data.runtime_analysis.statistics.max * 24)} hrs</div>
            <p className="text-xs text-muted-foreground">Longest job execution</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-chart-4">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Jobs Analyzed</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(data.runtime_analysis.statistics.count / 1000)}K</div>
            <p className="text-xs text-muted-foreground">Total runtime samples</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Runtime Distribution
            </CardTitle>
            <CardDescription>Statistical breakdown of job execution times</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">25th Percentile</span>
                <Badge variant="outline">{Math.round(data.runtime_analysis.statistics["25%"] * 24 * 1000) / 1000} hrs</Badge>
              </div>
              <Progress value={25} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">50th Percentile</span>
                <Badge variant="outline">{Math.round(data.runtime_analysis.statistics["50%"] * 24 * 1000) / 1000} hrs</Badge>
              </div>
              <Progress value={50} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">75th Percentile</span>
                <Badge variant="outline">{Math.round(data.runtime_analysis.statistics["75%"] * 24 * 1000) / 1000} hrs</Badge>
              </div>
              <Progress value={75} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Performance Metrics
            </CardTitle>
            <CardDescription>Statistical analysis of runtime patterns</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Standard Deviation</span>
                <span className="text-sm text-muted-foreground">10.59 hrs</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Variance</span>
                <span className="text-sm text-muted-foreground">High</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Short Jobs (&lt;1hr)</span>
                <Badge variant="secondary">78.2%</Badge>
              </div>
              <Progress value={78.2} className="h-2" />
              <p className="text-xs text-muted-foreground">Most jobs complete quickly</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

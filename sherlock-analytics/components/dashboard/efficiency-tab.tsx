import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Target, TrendingDown, Clock, Cpu, MemoryStick, AlertTriangle } from "lucide-react"

import { SlurmData } from "@/types/slurm"

interface EfficiencyTabProps {
  data: SlurmData
}

export function EfficiencyTab({ data }: EfficiencyTabProps) {
  const avgCpuHours = data?.resource_usage?.cpu_hours?.average_per_job || 0
  const maxCpuCores = data?.resource_usage?.cpu_cores?.statistics?.max || 100
  const avgCpuCores = data?.resource_usage?.cpu_cores?.statistics?.mean || 50
  const cpuEfficiency = Math.round((avgCpuCores / maxCpuCores) * 100)

  const completedRate = data?.job_states?.states?.find((s) => s.state === "COMPLETED")?.percentage || 0
  const failedRate = data?.job_states?.states?.find((s) => s.state === "FAILED")?.percentage || 0
  const resourceWaste = Math.round(failedRate + (100 - cpuEfficiency) / 2)

  const runtimeMean = data?.runtime_analysis?.statistics?.mean || 0.1
  const runtimeMax = data?.runtime_analysis?.statistics?.max || 1
  const runtimeMedian = data?.runtime_analysis?.statistics?.["50%"] || 0.1

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-destructive">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resource Waste</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{resourceWaste}%</div>
            <p className="text-xs text-muted-foreground">Unused allocated resources</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-chart-4">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Job Success Rate</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-chart-4">{completedRate}%</div>
            <p className="text-xs text-muted-foreground">Jobs completing successfully</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-chart-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CPU Efficiency</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cpuEfficiency}%</div>
            <p className="text-xs text-muted-foreground">Average CPU utilization</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-chart-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Runtime Efficiency</CardTitle>
            <MemoryStick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(runtimeMean * 24)}h</div>
            <p className="text-xs text-muted-foreground">Average job runtime</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Resource Utilization Analysis
            </CardTitle>
            <CardDescription>Efficiency metrics across different resource types</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">CPU Efficiency</span>
                <Badge variant="outline">{cpuEfficiency}%</Badge>
              </div>
              <Progress value={cpuEfficiency} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Avg: {Math.round(avgCpuCores)} cores/job | Max: {Math.round(maxCpuCores)} cores
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Runtime Distribution</span>
                <Badge variant="outline">{Math.round(runtimeMean * 24)}h</Badge>
              </div>
              <Progress value={Math.min((runtimeMean / runtimeMax) * 100, 100)} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Median: {Math.round(runtimeMedian * 24)}h | Max: {Math.round(runtimeMax * 24)}h
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Job Success Rate</span>
                <Badge variant="outline">{completedRate}%</Badge>
              </div>
              <Progress value={completedRate} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {(data?.job_states?.states?.find((s) => s.state === "COMPLETED")?.count || 0).toLocaleString()}{" "}
                completed jobs
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Efficiency Opportunities
            </CardTitle>
            <CardDescription>Areas for optimization and improvement</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="h-4 w-4 text-destructive" />
                <span className="font-medium">Failed Jobs</span>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                {failedRate}% of jobs fail, wasting{" "}
                {(data?.job_states?.states?.find((s) => s.state === "FAILED")?.count || 0).toLocaleString()} job
                slots
              </p>
              <Badge variant="destructive">High Priority</Badge>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Cpu className="h-4 w-4 text-chart-5" />
                <span className="font-medium">CPU Over-allocation</span>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                Average CPU usage suggests potential for right-sizing requests
              </p>
              <Badge variant="secondary">Medium Priority</Badge>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-chart-3" />
                <span className="font-medium">Runtime Optimization</span>
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                Long-running jobs may benefit from checkpointing strategies
              </p>
              <Badge variant="secondary">Medium Priority</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Resource Statistics Summary
          </CardTitle>
          <CardDescription>Key efficiency metrics from cluster analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-accent">{Math.round(avgCpuCores)}</div>
              <p className="text-sm text-muted-foreground">Avg CPU Cores/Job</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-accent">
                {Math.round((data?.resource_usage?.cpu_hours?.total || 0) / 1000)}K
              </div>
              <p className="text-sm text-muted-foreground">Total CPU Hours</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-accent">{Math.round(avgCpuHours)}h</div>
              <p className="text-sm text-muted-foreground">Avg Runtime</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Cpu, HardDrive, Zap, Server } from "lucide-react"

import { SlurmData } from "@/types/slurm"

interface ResourcesTabProps {
  data: SlurmData
}

export function ResourcesTab({ data }: ResourcesTabProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-chart-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg CPU Cores</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">9.0</div>
            <p className="text-xs text-muted-foreground">Per job allocation</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-chart-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Max CPU Cores</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3,200</div>
            <p className="text-xs text-muted-foreground">Largest allocation</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-chart-3">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">GPU Jobs</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.gpu_analysis.gpu_jobs.percentage.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">{data.gpu_analysis.gpu_jobs.count.toLocaleString()} jobs</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-chart-4">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total CPU Hours</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(data.resource_usage.cpu_hours.total / 1000000)}M</div>
            <p className="text-xs text-muted-foreground">Compute hours used</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5" />
              CPU Core Distribution
            </CardTitle>
            <CardDescription>Statistical analysis of CPU core usage</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Mean Cores</span>
                <Badge variant="outline">{Math.round(data.resource_usage.cpu_cores.statistics.mean)}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Median Cores</span>
                <Badge variant="outline">2</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">75th Percentile</span>
                <Badge variant="outline">6</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Standard Deviation</span>
                <Badge variant="secondary">{Math.round(data.resource_usage.cpu_cores.statistics.std)}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              GPU Utilization
            </CardTitle>
            <CardDescription>Graphics processing unit usage patterns</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">GPU Jobs</span>
                <span className="text-sm text-muted-foreground">
                  {data.gpu_analysis.gpu_jobs.count.toLocaleString()}
                </span>
              </div>
              <Progress value={data.gpu_analysis.gpu_jobs.percentage} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {data.gpu_analysis.gpu_jobs.percentage.toFixed(1)}% of all jobs used GPU resources
              </p>
            </div>

            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <div className="text-center">
                <div className="text-lg font-semibold text-accent">
                  {(100 - data.gpu_analysis.gpu_jobs.percentage).toFixed(1)}%
                </div>
                <p className="text-sm text-muted-foreground">CPU-only jobs</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

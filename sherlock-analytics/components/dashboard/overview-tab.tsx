import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, AlertTriangle, Server, Cpu, Users, Calendar, Activity } from "lucide-react"
import { SlurmData, JobState } from "@/types/slurm"

interface OverviewTabProps {
  data: SlurmData
}

export function OverviewTab({ data }: OverviewTabProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-chart-4">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.metadata.total_jobs.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Over {data.metadata.date_range.total_days} days</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-chart-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-chart-4">
              {data.job_states.states.find((s: JobState) => s.state === "COMPLETED")?.percentage || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {data.job_states.states.find((s: JobState) => s.state === "COMPLETED")?.count.toLocaleString() || 0} completed jobs
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-destructive">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Jobs</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {data.job_states.states.find((s: JobState) => s.state === "FAILED")?.percentage || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {data.job_states.states.find((s: JobState) => s.state === "FAILED")?.count.toLocaleString() || 0} failed jobs
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-chart-5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.user_analysis.total_users}</div>
            <p className="text-xs text-muted-foreground">Unique researchers</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Job States Distribution
            </CardTitle>
            <CardDescription>Breakdown of job completion states across the cluster</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(() => {
              // Group and organize job states for better display
              const completedJobs = data.job_states.states.find((s: JobState) => s.state === "COMPLETED")
              const failedJobs = data.job_states.states.find((s: JobState) => s.state === "FAILED")
              const outOfMemoryJobs = data.job_states.states.find((s: JobState) => s.state === "OUT_OF_MEMORY")
              
              // Group all cancelled jobs together
              const cancelledJobs = data.job_states.states.filter((s: JobState) => s.state.startsWith("CANCELLED"))
              const totalCancelledCount = cancelledJobs.reduce((sum: number, job: JobState) => sum + job.count, 0)
              const totalCancelledPercentage = cancelledJobs.reduce((sum: number, job: JobState) => sum + job.percentage, 0)
              
              // Get specific job states we want to display individually
              const nodeFailJobs = data.job_states.states.find((s: JobState) => s.state === "NODE_FAIL")
              const requeuedJobs = data.job_states.states.find((s: JobState) => s.state === "REQUEUED")
              
              // Get remaining other job states
              const otherJobs = data.job_states.states.filter((s: JobState) => 
                !s.state.startsWith("CANCELLED") && 
                s.state !== "COMPLETED" && 
                s.state !== "FAILED" && 
                s.state !== "TIMEOUT" && 
                s.state !== "OUT_OF_MEMORY" &&
                s.state !== "NODE_FAIL" &&
                s.state !== "REQUEUED"
              )
              
              return (
                <>
                  {/* Major job states */}
                  {completedJobs && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-chart-4" />
                          <span className="text-sm font-medium">Completed</span>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                            {completedJobs.percentage}%
                          </Badge>
                          <p className="text-xs text-muted-foreground">{completedJobs.count.toLocaleString()} jobs</p>
                        </div>
                      </div>
                      <Progress value={completedJobs.percentage} className="h-2 bg-green-100" />
                    </div>
                  )}

                  {failedJobs && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <XCircle className="h-4 w-4 text-destructive" />
                          <span className="text-sm font-medium">Failed</span>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
                            {failedJobs.percentage}%
                          </Badge>
                          <p className="text-xs text-muted-foreground">{failedJobs.count.toLocaleString()} jobs</p>
                        </div>
                      </div>
                      <Progress value={failedJobs.percentage} className="h-2 bg-red-100" />
                    </div>
                  )}

                  {/* Cancelled jobs - grouped together */}
                  {cancelledJobs.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-600" />
                          <span className="text-sm font-medium">Cancelled (All Types)</span>
                          <Badge variant="secondary" className="text-xs">
                            {cancelledJobs.length} reasons
                          </Badge>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">
                            {totalCancelledPercentage.toFixed(1)}%
                          </Badge>
                          <p className="text-xs text-muted-foreground">{totalCancelledCount.toLocaleString()} jobs</p>
                        </div>
                      </div>
                      <Progress value={totalCancelledPercentage} className="h-2 bg-amber-100" />
                      
                                             {/* Expandable cancelled jobs breakdown */}
                       <details className="mt-3">
                         <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors">
                           Click to see cancellation reasons
                         </summary>
                         <div className="mt-2 space-y-1 pl-4 border-l-2 border-amber-200">
                           {cancelledJobs.map((job: JobState) => (
                             <div key={job.state} className="flex items-center justify-between text-xs">
                               <span className="text-muted-foreground">
                                 {job.state.replace('CANCELLED_by_', 'User ')}
                               </span>
                               <span className="font-medium">{job.count.toLocaleString()}</span>
                             </div>
                           ))}
                         </div>
                       </details>
                    </div>
                  )}



                  {outOfMemoryJobs && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-purple-600" />
                          <span className="text-sm font-medium">Out of Memory</span>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-200">
                            {outOfMemoryJobs.percentage}%
                          </Badge>
                          <p className="text-xs text-muted-foreground">{outOfMemoryJobs.count.toLocaleString()} jobs</p>
                        </div>
                      </div>
                      <Progress value={outOfMemoryJobs.percentage} className="h-2 bg-purple-100" />
                    </div>
                  )}

                  {nodeFailJobs && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                          <span className="text-sm font-medium">Node Fail</span>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
                            {nodeFailJobs.percentage}%
                          </Badge>
                          <p className="text-xs text-muted-foreground">{nodeFailJobs.count.toLocaleString()} jobs</p>
                        </div>
                      </div>
                      <Progress value={nodeFailJobs.percentage} className="h-2 bg-red-100" />
                    </div>
                  )}

                  {requeuedJobs && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium">Requeued</span>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
                            {requeuedJobs.percentage}%
                          </Badge>
                          <p className="text-xs text-muted-foreground">{requeuedJobs.count.toLocaleString()} jobs</p>
                        </div>
                      </div>
                      <Progress value={requeuedJobs.percentage} className="h-2 bg-blue-100" />
                    </div>
                  )}

                  {/* Other job states */}
                  {otherJobs.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-gray-600" />
                          <span className="text-sm font-medium">Other States</span>
                          <Badge variant="secondary" className="text-xs">
                            {otherJobs.length} types
                          </Badge>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200">
                            {otherJobs.reduce((sum: number, job: JobState) => sum + job.percentage, 0).toFixed(1)}%
                          </Badge>
                          <p className="text-xs text-muted-foreground">
                            {otherJobs.reduce((sum: number, job: JobState) => sum + job.count, 0).toLocaleString()} jobs
                          </p>
                        </div>
                      </div>
                      <Progress 
                        value={otherJobs.reduce((sum: number, job: JobState) => sum + job.percentage, 0)} 
                        className="h-2 bg-gray-100" 
                      />
                      
                                             {/* Expandable other states breakdown */}
                       <details className="mt-3">
                         <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors">
                           Click to see other job states
                         </summary>
                         <div className="mt-2 space-y-1 pl-4 border-l-2 border-gray-200">
                           {otherJobs.map((job: JobState) => (
                             <div key={job.state} className="flex items-center justify-between text-xs">
                               <span className="text-muted-foreground">{job.state}</span>
                               <span className="font-medium">{job.count.toLocaleString()}</span>
                             </div>
                           ))}
                         </div>
                       </details>
                    </div>
                  )}
                </>
              )
            })()}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5" />
              Resource Utilization
            </CardTitle>
            <CardDescription>CPU and GPU usage statistics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total CPU Hours</span>
                <span className="text-sm text-muted-foreground">
                  {Math.round(data.resource_usage.cpu_hours.total).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Avg CPU Hours/Job</span>
                <span className="text-sm text-muted-foreground">
                  {Math.round(data.resource_usage.cpu_hours.average_per_job)}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">GPU Jobs</span>
                <Badge variant="secondary">{data.gpu_analysis.gpu_jobs.percentage.toFixed(1)}%</Badge>
              </div>
              <Progress value={data.gpu_analysis.gpu_jobs.percentage} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {data.gpu_analysis.gpu_jobs.count.toLocaleString()} jobs used GPU resources
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Analysis Period
          </CardTitle>
          <CardDescription>Data collection timeframe and coverage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-accent">{data.metadata.date_range.total_days}</div>
              <p className="text-sm text-muted-foreground">Days Analyzed</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-accent">
                {Math.round(data.metadata.total_jobs / data.metadata.date_range.total_days).toLocaleString()}
              </div>
              <p className="text-sm text-muted-foreground">Avg Jobs/Day</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-accent">
                {Math.round(data.resource_usage.cpu_cores.statistics.mean)}
              </div>
              <p className="text-sm text-muted-foreground">Avg CPU Cores</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

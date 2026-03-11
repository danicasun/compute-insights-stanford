import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Zap, Users } from "lucide-react"
import { DashboardInsights } from "@/types/dashboard-insights"

interface EnergyTabProps {
  data: DashboardInsights
}

export function EnergyTab({ data }: EnergyTabProps) {
  const energyStats = data.distributions.numeric.energy_kWh
  const topEnergyUsers = data.top_users_by_energy.slice(0, 10)
  const formatRankedUserCode = (rankIndex: number) => `User ${rankIndex + 1}`

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {data.job_type_breakdown.map((jobType) => (
          <Card key={jobType.job_type} className="border-l-4 border-l-chart-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{jobType.job_type} Jobs</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="text-2xl font-bold">{jobType.job_count.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {jobType.energy_mean_kwh.toFixed(2)} {data.units.energy} mean
              </p>
              <p className="text-xs text-muted-foreground">
                {jobType.energy_total_kwh.toLocaleString()} {data.units.energy} total
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Energy Distribution
            </CardTitle>
            <CardDescription>Overall distribution of per-job energy usage</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Mean</span>
              <Badge variant="outline">{energyStats.mean.toFixed(2)} {data.units.energy}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Median</span>
              <Badge variant="outline">{energyStats.median.toFixed(2)} {data.units.energy}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">95th Percentile</span>
              <Badge variant="secondary">{energyStats.p95.toFixed(2)} {data.units.energy}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Max</span>
              <Badge variant="secondary">{energyStats.max.toFixed(2)} {data.units.energy}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Top Users by Energy
            </CardTitle>
            <CardDescription>Highest total energy consumption</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {topEnergyUsers.map((user, index) => (
              <div key={user.user} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">#{index + 1}</span>
                  <span className="text-sm font-medium">{formatRankedUserCode(index)}</span>
                </div>
                <Badge variant="outline">
                  {user.energy_total_kwh.toLocaleString()} {data.units.energy}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

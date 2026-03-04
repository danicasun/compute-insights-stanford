import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, User, TrendingUp, Activity } from "lucide-react"

import { SlurmData } from "@/types/slurm"

interface UsersTabProps {
  data: SlurmData
}

export function UsersTab({ data }: UsersTabProps) {
  // Mock top users data based on the structure
  const topUsers = [
    { id: 1, jobs: 108982, percentage: 12.67 },
    { id: 2, jobs: 93321, percentage: 10.85 },
    { id: 3, jobs: 78650, percentage: 9.14 },
    { id: 4, jobs: 69395, percentage: 8.07 },
    { id: 5, jobs: 42958, percentage: 4.99 },
  ]

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-chart-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.user_analysis.total_users}</div>
            <p className="text-xs text-muted-foreground">Active researchers</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-chart-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Jobs/User</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(data.metadata.total_jobs / data.user_analysis.total_users).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Per user activity</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-chart-3">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top User Share</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{topUsers[0].percentage}%</div>
            <p className="text-xs text-muted-foreground">Most active user</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-chart-4">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top 5 Share</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {topUsers.reduce((sum, user) => sum + user.percentage, 0).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">Combined usage</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Top Users by Job Count
            </CardTitle>
            <CardDescription>Most active researchers on the cluster (anonymized)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topUsers.map((user, index) => (
                <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-accent/10 text-accent rounded-full text-sm font-semibold">
                      #{index + 1}
                    </div>
                    <div>
                      <p className="font-medium">User {user.id}</p>
                      <p className="text-sm text-muted-foreground">{user.jobs.toLocaleString()} jobs submitted</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary">{user.percentage}%</Badge>
                    <p className="text-xs text-muted-foreground mt-1">of total jobs</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              User Distribution Analysis
            </CardTitle>
            <CardDescription>Understanding cluster usage patterns across the user base</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-3">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-accent">
                  {Math.round(
                    (topUsers.reduce((sum, user) => sum + user.percentage, 0) / 100) * data.user_analysis.total_users,
                  )}
                </div>
                <p className="text-sm text-muted-foreground">Power Users</p>
                <p className="text-xs text-muted-foreground mt-1">Top 5 users</p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-accent">
                  {data.user_analysis.total_users -
                    Math.round(
                      (topUsers.reduce((sum, user) => sum + user.percentage, 0) / 100) * data.user_analysis.total_users,
                    )}
                </div>
                <p className="text-sm text-muted-foreground">Regular Users</p>
                <p className="text-xs text-muted-foreground mt-1">Remaining users</p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-accent">
                  {Math.round(
                    data.metadata.total_jobs / data.metadata.date_range.total_days / data.user_analysis.total_users,
                  )}
                </div>
                <p className="text-sm text-muted-foreground">Jobs/User/Day</p>
                <p className="text-xs text-muted-foreground mt-1">Average activity</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

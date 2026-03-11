import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, UserCircle } from "lucide-react"
import { DashboardInsights } from "@/types/dashboard-insights"

interface UsersAccountsTabProps {
  data: DashboardInsights
}

export function UsersAccountsTab({ data }: UsersAccountsTabProps) {
  const topUsers = [...data.aggregations.by_user]
    .sort((a, b) => b.job_count - a.job_count)
    .slice(0, 10)
  const topAccounts = [...data.aggregations.by_account]
    .sort((a, b) => b.job_count - a.job_count)
    .slice(0, 10)
  const formatRankedUserCode = (rankIndex: number) => `User ${rankIndex + 1}`
  const formatRankedAccountCode = (rankIndex: number) => `Account ${rankIndex + 1}`

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Top Users
            </CardTitle>
            <CardDescription>Ranked by job count</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {topUsers.map((user, index) => (
              <div key={user.user} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">#{index + 1}</span>
                  <span className="text-sm font-medium">{formatRankedUserCode(index)}</span>
                </div>
                <div className="text-right">
                  <Badge variant="outline">{user.job_count.toLocaleString()} jobs</Badge>
                  <p className="text-xs text-muted-foreground">
                    {user.energy_mean_kwh.toFixed(2)} {data.units.energy} mean
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCircle className="h-5 w-5" />
              Top Accounts
            </CardTitle>
            <CardDescription>Ranked by job count</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {topAccounts.map((account, index) => (
              <div key={account.account} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">#{index + 1}</span>
                  <span className="text-sm font-medium">{formatRankedAccountCode(index)}</span>
                </div>
                <div className="text-right">
                  <Badge variant="outline">{account.job_count.toLocaleString()} jobs</Badge>
                  <p className="text-xs text-muted-foreground">
                    {account.energy_mean_kwh.toFixed(2)} {data.units.energy} mean
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, Clock } from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
} from "recharts"
import { DashboardInsights } from "@/types/dashboard-insights"

interface TemporalTabProps {
  data: DashboardInsights
}

export function TemporalTab({ data }: TemporalTabProps) {
  const byDay = [...data.aggregations.by_day].sort(
    (a, b) => new Date(a.start_day).getTime() - new Date(b.start_day).getTime(),
  )
  const byHour = [...data.aggregations.by_hour_of_day].sort(
    (a, b) => Number(a.start_hour) - Number(b.start_hour),
  )

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Daily Jobs & Energy
          </CardTitle>
          <CardDescription>Job volume and energy mean by UTC day</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={byDay}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="start_day" hide />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="job_count"
                stroke="#8884d8"
                strokeWidth={2}
                name="Jobs"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="energy_mean_kwh"
                stroke="#82ca9d"
                strokeWidth={2}
                name={`Energy Mean (${data.units.energy})`}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Hour-of-Day Patterns
          </CardTitle>
          <CardDescription>Job count by UTC hour of day</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={byHour}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="start_hour" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="job_count" fill="#8884d8" name="Jobs" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}

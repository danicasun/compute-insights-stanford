import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Database, FileText, Info } from "lucide-react"
import { DashboardInsights } from "@/types/dashboard-insights"

interface DocumentationTabProps {
  data: DashboardInsights
}

export function DocumentationTab({ data }: DocumentationTabProps) {
  const featureMissingness = Object.entries(data.missingness.features)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
  const schemaFields = Object.entries(data.schema.features).sort((a, b) => a[0].localeCompare(b[0]))

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Source Summary
          </CardTitle>
          <CardDescription>Dataset metadata, units, and record availability</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span>Generated at (UTC)</span>
            <Badge variant="outline">{data.generated_at_utc}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>Energy unit</span>
            <Badge variant="outline">{data.units.energy}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>Duration unit</span>
            <Badge variant="outline">{data.units.duration}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>Timestamps</span>
            <Badge variant="outline">{data.units.timestamps}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>Records included</span>
            <Badge variant="secondary">{data.records.omitted ? "Omitted" : "Included"}</Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Schema (Features)
            </CardTitle>
            <CardDescription>Field names and inferred data types</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {schemaFields.map(([field, fieldType]) => (
              <div key={field} className="flex items-center justify-between">
                <span className="font-medium">{field}</span>
                <Badge variant="outline">{fieldType}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Missingness
            </CardTitle>
            <CardDescription>Fields with non-zero missing values</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {featureMissingness.length === 0 ? (
              <div className="text-muted-foreground">No missing values reported for features.</div>
            ) : (
              featureMissingness.map(([field, count]) => (
                <div key={field} className="flex items-center justify-between">
                  <span className="font-medium">{field}</span>
                  <Badge variant="secondary">{count.toLocaleString()} missing</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Records Footprint
          </CardTitle>
          <CardDescription>Raw record metadata</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span>Columns available</span>
            <Badge variant="outline">{data.records.columns.length}</Badge>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {data.records.columns.map((column) => (
              <span key={column} className="rounded bg-muted px-2 py-1">
                {column}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

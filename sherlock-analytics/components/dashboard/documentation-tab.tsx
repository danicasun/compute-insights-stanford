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
    <div className="min-w-0 max-w-full space-y-6">
      <Card className="min-w-0 overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 shrink-0" />
            Data Source Summary
          </CardTitle>
          <CardDescription>Dataset metadata, units, and record availability</CardDescription>
        </CardHeader>
        <CardContent className="min-w-0 space-y-3 text-sm">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
            <span className="shrink-0 text-muted-foreground">Generated at (UTC)</span>
            <Badge variant="outline" className="w-fit max-w-full whitespace-normal break-all text-left">
              {data.generated_at_utc}
            </Badge>
          </div>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
            <span className="shrink-0 text-muted-foreground">Energy unit</span>
            <Badge variant="outline" className="w-fit max-w-full whitespace-normal break-all">
              {data.units.energy}
            </Badge>
          </div>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
            <span className="shrink-0 text-muted-foreground">Duration unit</span>
            <Badge variant="outline" className="w-fit max-w-full whitespace-normal break-all">
              {data.units.duration}
            </Badge>
          </div>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
            <span className="shrink-0 text-muted-foreground">Timestamps</span>
            <Badge variant="outline" className="w-fit max-w-full whitespace-normal break-all">
              {data.units.timestamps}
            </Badge>
          </div>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
            <span className="shrink-0 text-muted-foreground">Records included</span>
            <Badge variant="secondary">{data.records.omitted ? "Omitted" : "Included"}</Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid min-w-0 gap-6 md:grid-cols-2">
        <Card className="min-w-0 overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 shrink-0" />
              Schema (Features)
            </CardTitle>
            <CardDescription>Field names and inferred data types</CardDescription>
          </CardHeader>
          <CardContent className="min-w-0 space-y-3 text-sm">
            {schemaFields.map(([field, fieldType]) => (
              <div
                key={field}
                className="grid grid-cols-1 gap-x-3 gap-y-1 border-b border-border/40 pb-3 last:border-b-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start"
              >
                <span className="min-w-0 break-words font-medium [overflow-wrap:anywhere]">{field}</span>
                <Badge variant="outline" className="h-fit w-fit max-w-full shrink-0 justify-self-start whitespace-normal break-all sm:justify-self-end">
                  {fieldType}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="min-w-0 overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              Missingness
            </CardTitle>
            <CardDescription>Fields with non-zero missing values</CardDescription>
          </CardHeader>
          <CardContent className="min-w-0 space-y-3 text-sm">
            {featureMissingness.length === 0 ? (
              <div className="text-muted-foreground">No missing values reported for features.</div>
            ) : (
              featureMissingness.map(([field, count]) => (
                <div
                  key={field}
                  className="grid grid-cols-1 gap-x-3 gap-y-1 border-b border-border/40 pb-3 last:border-b-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start"
                >
                  <span className="min-w-0 break-words font-medium [overflow-wrap:anywhere]">{field}</span>
                  <Badge variant="secondary" className="h-fit w-fit shrink-0 justify-self-start sm:justify-self-end">
                    {count.toLocaleString()} missing
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="min-w-0 overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 shrink-0" />
            Records Footprint
          </CardTitle>
          <CardDescription>Raw record metadata</CardDescription>
        </CardHeader>
        <CardContent className="min-w-0 space-y-3 text-sm">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
            <span className="shrink-0 text-muted-foreground">Columns available</span>
            <Badge variant="outline">{data.records.columns.length}</Badge>
          </div>
          <div className="flex min-w-0 flex-wrap gap-2 text-xs text-muted-foreground">
            {data.records.columns.map((column) => (
              <span
                key={column}
                className="max-w-full min-w-0 break-words rounded bg-muted px-2 py-1 [overflow-wrap:anywhere]"
              >
                {column}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

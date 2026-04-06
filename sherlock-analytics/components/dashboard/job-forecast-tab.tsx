import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  JobPredictionParameters,
  JobPredictionResponse,
  requestJobPrediction,
} from "@/lib/prediction-client"

const defaultJobPredictionParameters: JobPredictionParameters = {
  partitionName: "",
  nodeCount: 1,
  cpuCores: 1,
  gpuCount: 0,
  memoryGigabytes: 4,
  walltimeHours: 1,
}

/** Formats an ISO-8601 instant for display in Pacific time (PST or PDT per US rules). */
function formatIsoUtcToPacific(isoUtc: string): string {
  const instant = new Date(isoUtc)
  if (Number.isNaN(instant.getTime())) {
    return isoUtc
  }
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    dateStyle: "medium",
    timeStyle: "long",
  }).format(instant)
}

function parseWalltimeHours(rawValue: string): number | null {
  const trimmedValue = rawValue.trim()
  if (!trimmedValue) {
    return null
  }

  const daySplit = trimmedValue.split("-")
  let days = 0
  let timePart = trimmedValue

  if (daySplit.length === 2) {
    days = Number(daySplit[0])
    timePart = daySplit[1]
  }

  const timeSegments = timePart.split(":").map(Number)
  if (timeSegments.some((segment) => Number.isNaN(segment))) {
    return null
  }

  let hours = 0
  let minutes = 0
  let seconds = 0

  if (timeSegments.length === 3) {
    ;[hours, minutes, seconds] = timeSegments
  } else if (timeSegments.length === 2) {
    ;[hours, minutes] = timeSegments
  } else if (timeSegments.length === 1) {
    hours = timeSegments[0]
  }

  return days * 24 + hours + minutes / 60 + seconds / 3600
}

function parseMemoryToGigabytes(rawValue: string): number | null {
  const trimmedValue = rawValue.trim().toUpperCase()
  if (!trimmedValue) {
    return null
  }

  const match = trimmedValue.match(/^([0-9.]+)\s*([KMGTP]?B?)?$/)
  if (!match) {
    return null
  }

  const numericValue = Number(match[1])
  const unit = match[2] ?? "G"

  if (Number.isNaN(numericValue)) {
    return null
  }

  switch (unit) {
    case "K":
    case "KB":
      return numericValue / (1024 * 1024)
    case "M":
    case "MB":
      return numericValue / 1024
    case "G":
    case "GB":
      return numericValue
    case "T":
    case "TB":
      return numericValue * 1024
    case "P":
    case "PB":
      return numericValue * 1024 * 1024
    default:
      return null
  }
}

function parseSbatchText(sbatchText: string): Partial<JobPredictionParameters> {
  const parsedParameters: Partial<JobPredictionParameters> = {}
  const directives = sbatchText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("#SBATCH"))

  directives.forEach((directive) => {
    const normalized = directive.replace(/^#SBATCH\s+/, "")

    if (normalized.startsWith("--partition")) {
      const value = normalized.split(/[= ]/)[1]
      if (value) {
        parsedParameters.partitionName = value
      }
    }

    if (normalized.startsWith("--nodes")) {
      const value = Number(normalized.split(/[= ]/)[1])
      if (!Number.isNaN(value)) {
        parsedParameters.nodeCount = value
      }
    }

    if (normalized.startsWith("--cpus-per-task")) {
      const value = Number(normalized.split(/[= ]/)[1])
      if (!Number.isNaN(value)) {
        parsedParameters.cpuCores = value
      }
    }

    if (normalized.startsWith("--gres")) {
      const match = normalized.match(/gpu:([0-9]+)/)
      if (match) {
        parsedParameters.gpuCount = Number(match[1])
      }
    }

    if (normalized.startsWith("--mem")) {
      const value = normalized.split(/[= ]/)[1]
      const memoryGigabytes = value ? parseMemoryToGigabytes(value) : null
      if (memoryGigabytes !== null) {
        parsedParameters.memoryGigabytes = memoryGigabytes
      }
    }

    if (normalized.startsWith("--time")) {
      const value = normalized.split(/[= ]/)[1]
      const walltimeHours = value ? parseWalltimeHours(value) : null
      if (walltimeHours !== null) {
        parsedParameters.walltimeHours = walltimeHours
      }
    }
  })

  return parsedParameters
}

export function JobForecastTab() {
  const [sbatchText, setSbatchText] = useState("")
  const [jobPredictionParameters, setJobPredictionParameters] = useState<JobPredictionParameters>(
    defaultJobPredictionParameters,
  )
  const [predictionResult, setPredictionResult] = useState<JobPredictionResponse | null>(null)
  const [predictionError, setPredictionError] = useState<string | null>(null)
  const [isPredicting, setIsPredicting] = useState(false)

  const handleParseSbatch = () => {
    const parsedParameters = parseSbatchText(sbatchText)
    setJobPredictionParameters((previous) => ({ ...previous, ...parsedParameters }))
  }

  const handlePrediction = async () => {
    setPredictionError(null)
    setIsPredicting(true)
    try {
      const result = await requestJobPrediction({
        sbatchText: sbatchText.trim() ? sbatchText : undefined,
        parameters: jobPredictionParameters,
      })
      setPredictionResult(result)
    } catch (error) {
      setPredictionError(error instanceof Error ? error.message : "Prediction failed.")
    } finally {
      setIsPredicting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>SBATCH Input</CardTitle>
            <CardDescription>Paste an SBATCH script to auto-fill job parameters.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <textarea
              value={sbatchText}
              onChange={(event) => setSbatchText(event.target.value)}
              placeholder="#SBATCH --partition=serc\n#SBATCH --cpus-per-task=8\n#SBATCH --mem=32G\n#SBATCH --time=02:00:00"
              className={cn(
                "min-h-[200px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-none",
                "placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/30 focus-visible:ring-[3px]",
              )}
            />
            <Button variant="default" onClick={handleParseSbatch}>
              Parse SBATCH
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Job Parameters</CardTitle>
            <CardDescription>Enter job parameters directly (units in hours, GB).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              <label className="text-sm font-medium">Partition</label>
              <Input
                value={jobPredictionParameters.partitionName ?? ""}
                onChange={(event) =>
                  setJobPredictionParameters((previous) => ({
                    ...previous,
                    partitionName: event.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-3">
              <label className="text-sm font-medium">Nodes</label>
              <Input
                type="number"
                min={1}
                value={jobPredictionParameters.nodeCount ?? ""}
                onChange={(event) =>
                  setJobPredictionParameters((previous) => ({
                    ...previous,
                    nodeCount: Number(event.target.value || 0),
                  }))
                }
              />
            </div>
            <div className="grid gap-3">
              <label className="text-sm font-medium">CPU Cores</label>
              <Input
                type="number"
                min={1}
                value={jobPredictionParameters.cpuCores ?? ""}
                onChange={(event) =>
                  setJobPredictionParameters((previous) => ({
                    ...previous,
                    cpuCores: Number(event.target.value || 0),
                  }))
                }
              />
            </div>
            <div className="grid gap-3">
              <label className="text-sm font-medium">GPU Count</label>
              <Input
                type="number"
                min={0}
                value={jobPredictionParameters.gpuCount ?? ""}
                onChange={(event) =>
                  setJobPredictionParameters((previous) => ({
                    ...previous,
                    gpuCount: Number(event.target.value || 0),
                  }))
                }
              />
            </div>
            <div className="grid gap-3">
              <label className="text-sm font-medium">Memory (GB)</label>
              <Input
                type="number"
                min={0}
                value={jobPredictionParameters.memoryGigabytes ?? ""}
                onChange={(event) =>
                  setJobPredictionParameters((previous) => ({
                    ...previous,
                    memoryGigabytes: Number(event.target.value || 0),
                  }))
                }
              />
            </div>
            <div className="grid gap-3">
              <label className="text-sm font-medium">Walltime (hours)</label>
              <Input
                type="number"
                min={0}
                step="0.1"
                value={jobPredictionParameters.walltimeHours ?? ""}
                onChange={(event) =>
                  setJobPredictionParameters((previous) => ({
                    ...previous,
                    walltimeHours: Number(event.target.value || 0),
                  }))
                }
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Prediction Output</CardTitle>
          <CardDescription>Energy and emissions estimates.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handlePrediction} disabled={isPredicting}>
            {isPredicting ? "Predicting..." : "Run Prediction"}
          </Button>

          {predictionError && (
            <div className="text-sm text-destructive">{predictionError}</div>
          )}

          {predictionResult && (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Energy</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{predictionResult.energyKwh.toFixed(2)} kWh</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Emissions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{predictionResult.emissionsKgCo2e.toFixed(2)} kg CO2e</div>
                </CardContent>
              </Card>
              <div className="md:col-span-2 text-sm text-muted-foreground">
                Emissions are estimated as energy (kWh) multiplied by grid intensity (g CO2e/kWh),
                converted to kg CO2e.{" "}
                {typeof predictionResult.carbonIntensityGco2ePerKwh === "number"
                  ? `Current intensity used: ${predictionResult.carbonIntensityGco2ePerKwh.toFixed(1)} g CO2e/kWh.`
                  : "Grid intensity uses the latest available value for the job zone."}
              </div>
              <div className="md:col-span-2 text-sm text-muted-foreground">
                <div>
                  Carbon intensity (g CO2e/kWh):{" "}
                  {typeof predictionResult.carbonIntensityGco2ePerKwh === "number"
                    ? predictionResult.carbonIntensityGco2ePerKwh.toFixed(1)
                    : "Unavailable"}
                </div>
                <div>
                  Zone: {predictionResult.zone ? predictionResult.zone : "Unavailable"}
                </div>
                <div>
                  Calculation time (Pacific):{" "}
                  {predictionResult.calculationTimestampUtc
                    ? formatIsoUtcToPacific(predictionResult.calculationTimestampUtc)
                    : "Unavailable"}
                </div>
              </div>
              {predictionResult.notes?.length ? (
                <div className="md:col-span-2 flex flex-wrap gap-2">
                  {predictionResult.notes.map((note) => (
                    <Badge key={note} variant="secondary">
                      {note}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

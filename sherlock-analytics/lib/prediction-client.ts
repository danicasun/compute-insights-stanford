export interface JobPredictionParameters {
  partitionName?: string
  nodeCount?: number
  cpuCores?: number
  gpuCount?: number
  memoryGigabytes?: number
  walltimeHours?: number
}

export interface JobPredictionRequest {
  sbatchText?: string
  parameters?: JobPredictionParameters
}

export interface JobPredictionResponse {
  energyKwh: number
  emissionsKgCo2e: number
  carbonIntensityGco2ePerKwh?: number
  calculationTimestampUtc?: string
  zone?: string
  notes?: string[]
}

export async function requestJobPrediction(
  request: JobPredictionRequest,
): Promise<JobPredictionResponse> {
  const response = await fetch("/api/job-prediction", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    let errorMessage = "Prediction request failed."
    try {
      const errorPayload = (await response.json()) as { error?: string }
      if (errorPayload?.error) {
        errorMessage = errorPayload.error
      }
    } catch {
      // Ignore JSON parsing errors and fall back to generic message.
    }
    throw new Error(errorMessage)
  }

  return (await response.json()) as JobPredictionResponse
}

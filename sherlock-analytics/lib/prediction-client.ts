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
  notes?: string[]
}

export async function requestJobPrediction(
  request: JobPredictionRequest,
): Promise<JobPredictionResponse> {
  const parameters = request.parameters ?? {}
  const cpuCores = parameters.cpuCores ?? 1
  const gpuCount = parameters.gpuCount ?? 0
  const walltimeHours = parameters.walltimeHours ?? 1

  const energyFromCpu = cpuCores * walltimeHours * 0.05
  const energyFromGpu = gpuCount * walltimeHours * 0.2
  const energyKwh = Math.max(0.01, energyFromCpu + energyFromGpu)

  const emissionsKgCo2e = energyKwh * 0.2

  return {
    energyKwh,
    emissionsKgCo2e,
    notes: [
      "Mock result only. Python service integration pending.",
      "Emissions factor will come from the carbon intensity API.",
    ],
  }
}

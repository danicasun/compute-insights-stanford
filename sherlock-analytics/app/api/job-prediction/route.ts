import { NextResponse } from "next/server"

interface JobPredictionProxyResponse {
  energy_kwh?: number
  emissions_kgco2e?: number
  carbon_intensity_gco2e_per_kwh?: number
  calculation_timestamp_utc?: string
  zone?: string
  notes?: string[]
}

const DEFAULT_PYTHON_PREDICTION_URL = "http://127.0.0.1:8001/predict"

export async function POST(request: Request) {
  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 })
  }

  const pythonServiceUrl =
    process.env.PYTHON_JOB_PREDICTION_URL ?? DEFAULT_PYTHON_PREDICTION_URL

  let pythonResponse: Response
  try {
    pythonResponse = await fetch(pythonServiceUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    })
  } catch (error) {
    let message =
      error instanceof Error ? error.message : "Python service request failed."
    const cause = error instanceof Error && "cause" in error ? error.cause : null
    if (cause && typeof cause === "object") {
      const maybeCause = cause as { code?: string; address?: string; port?: number }
      if (maybeCause.code === "ECONNREFUSED") {
        message = `Cannot connect to Python service at ${pythonServiceUrl}. Is it running?`
      }
    }
    return NextResponse.json({ error: message }, { status: 502 })
  }

  if (!pythonResponse.ok) {
    const errorBody = await pythonResponse.text()
    return NextResponse.json(
      { error: `Python service error: ${errorBody || pythonResponse.statusText}` },
      { status: 502 },
    )
  }

  const pythonPayload = (await pythonResponse.json()) as JobPredictionProxyResponse
  const energyKwh = pythonPayload.energy_kwh
  const emissionsKgCo2e = pythonPayload.emissions_kgco2e

  if (typeof energyKwh !== "number" || typeof emissionsKgCo2e !== "number") {
    return NextResponse.json(
      { error: "Python service response missing energy/emissions values." },
      { status: 502 },
    )
  }

  return NextResponse.json({
    energyKwh,
    emissionsKgCo2e,
    carbonIntensityGco2ePerKwh: pythonPayload.carbon_intensity_gco2e_per_kwh,
    calculationTimestampUtc: pythonPayload.calculation_timestamp_utc,
    zone: pythonPayload.zone,
    notes: pythonPayload.notes ?? [],
  })
}

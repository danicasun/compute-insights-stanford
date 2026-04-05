## Job Prediction API

Estimates energy (kWh), power (W), and CO₂e for a batch-style job from CPU/memory/walltime and grid carbon intensity for a geographic zone (Electricity Maps data in the backend). Optional Slurm `#SBATCH` text is parsed to fill missing fields; `zone` can be overridden. GPU power is not included in the model (the API may return a note when `gpuCount > 0`).

**Hypothesis for integrators:** Treat `POST /predict` as the only programmatic entry point; use `GET /docs` on the same host for the live OpenAPI schema and interactive requests. Send `Content-Type: application/json` and a JSON object matching the structure below.

---

### Hosted service (default for this repo’s dashboard)

| Item | Value |
|------|--------|
| **Base URL** | `https://energy-estimation-api.vercel.app` |
| **Health / hints** | `GET /` — small JSON: service name, link to `/docs`, predict hint |
| **Interactive docs** | `GET /docs` — Swagger UI |
| **Prediction** | `POST /predict` — JSON body (below) |

No API key is required for the public deployment. If authentication is added later, document it in any consuming repo.

#### `POST /predict` — request body (JSON)

All top-level fields are optional; combine `sbatchText` and `parameters` as needed. Values in `parameters` override parsed `#SBATCH` values when both are present.

```json
{
  "sbatchText": "#SBATCH ... optional full sbatch script text ...",
  "parameters": {
    "partitionName": "string or null",
    "nodeCount": 1,
    "cpuCores": 8,
    "gpuCount": 0,
    "memoryGigabytes": 16.0,
    "walltimeHours": 2.0
  },
  "zone": "optional ISO region/country code string to force grid zone"
}
```

**Semantics (high level):** If `sbatchText` is non-empty, the server parses Slurm directives. Integers/floats for cores, memory, walltime, etc. are merged with `parameters`. If `zone` is omitted, the server infers a zone from node list / partition mapping in the parser (Stanford-oriented defaults). Invalid types → **400** with a detail string; server errors → **500**.

#### `POST /predict` — success response (JSON)

Typical fields:

- `energy_kwh`, `emissions_kgco2e`, `emissions_gco2e`, `power_watts`
- `carbon_intensity_gco2e_per_kwh` (for the resolved zone)
- `zone` (string)
- `inputs`: echoed resolved inputs (`cpu_cores`, `gpu_count`, `node_count`, `partition_name`, `memory_gigabytes`, `walltime_hours`)
- `notes`: array of strings (e.g. GPU not modeled)

#### Calling from a script

**curl:**

```bash
curl -sS -X POST "https://energy-estimation-api.vercel.app/predict" \
  -H "Content-Type: application/json" \
  -d '{"parameters":{"cpuCores":4,"walltimeHours":1.0,"memoryGigabytes":8},"zone":"US-CA"}'
```

**Python (`requests`):**

```python
import requests

url = "https://energy-estimation-api.vercel.app/predict"
payload = {
    "parameters": {
        "cpuCores": 4,
        "walltimeHours": 1.0,
        "memoryGigabytes": 8.0,
    },
    "zone": "US-CA",  # optional
}
r = requests.post(url, json=payload, timeout=60)
r.raise_for_status()
data = r.json()
```

Use a timeout on HTTP clients (e.g. 60 seconds for serverless cold starts).

---

### Next.js proxy (`sherlock-analytics`)

The **Job Forecast** tab calls `/api/job-prediction`, which proxies to the prediction API.

- **Default upstream:** `https://energy-estimation-api.vercel.app/predict`
- **Override (local FastAPI or another deployment):**

```bash
export PYTHON_JOB_PREDICTION_URL="http://127.0.0.1:8001/predict"
```

The proxy uses a 60s timeout to accommodate cold starts on the hosted service.

---

### Local FastAPI (this repository)

Same request/response contract as the hosted service. Run when you need offline development or to change the power model / parser without deploying.

#### Requirements

- Python 3.10+
- Dependencies from `requirements.txt` (includes `fastapi` and `uvicorn`)

#### Run locally

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

export ELECTRICITYMAPS_API_KEY="your_key"
uvicorn job_prediction_api:app --host 0.0.0.0 --port 8001
```

Point the Next.js app at it:

```bash
export PYTHON_JOB_PREDICTION_URL="http://127.0.0.1:8001/predict"
```

#### Example `curl` (local)

```bash
curl -X POST "http://127.0.0.1:8001/predict" \
  -H "Content-Type: application/json" \
  -d '{
    "parameters": {
      "cpuCores": 8,
      "gpuCount": 1,
      "memoryGigabytes": 32,
      "walltimeHours": 2
    }
  }'
```

#### Response fields (units)

- `energy_kwh` (kWh)
- `emissions_kgco2e` (kg CO₂e)
- `emissions_gco2e` (g CO₂e)
- `carbon_intensity_gco2e_per_kwh` (g CO₂e/kWh)
- `power_watts` (W)

### systemd setup (local server)

1. Copy the unit file:
   ```bash
   sudo cp deploy/systemd/job-prediction-api.service /etc/systemd/system/
   ```
2. Edit the unit file to set:
   - `WorkingDirectory`
   - `PYTHONPATH`
   - `ELECTRICITYMAPS_API_KEY`
   - `ExecStart` (venv path)
   - `User` and `Group` (recommended)
3. Enable and start:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable job-prediction-api
   sudo systemctl start job-prediction-api
   sudo systemctl status job-prediction-api
   ```

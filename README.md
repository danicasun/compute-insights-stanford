# Stanford Sherlock Dashboard Insights

This repository contains analysis tools and a Next.js dashboard for the Stanford Sherlock cluster, powered by the `tabpfn_dashboard_insights.json` dataset.

## Overview

The dashboard summarizes job activity, energy usage, queue wait behavior, and temporal patterns using the insights JSON. It also includes a **Job Forecast** tab for energy and emissions predictions powered by a FastAPI backend.

## Dashboard (Next.js)

The dashboard lives in `sherlock-analytics/` and reads `tabpfn_dashboard_insights.json`. Current tabs include:
- **Overview**: dataset summary and headline energy/queue stats
- **Energy**: job type breakdown and top energy users
- **Queue & Walltime**: queue wait and requested walltime distributions
- **Users & Accounts**: usage rankings with energy context
- **Temporal**: daily and hour-of-day patterns
- **Job Forecast**: SBATCH paste + structured form backed by the Python prediction API
- **Data Quality**: schema and missingness overview

### Run locally

```bash
cd sherlock-analytics
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Data Source

- **Primary JSON**: `tabpfn_dashboard_insights.json`
- **Units**: energy in kWh, duration in hours, timestamps in UTC ISO-8601, counts in jobs

## Regenerating `tabpfn_dashboard_insights.json`

The dashboard JSON is built in two steps. Both scripts live under
`sherlock-analytics/` and should be invoked from the repository root using
the project's virtualenv. Inputs assumed in the current directory:

- `job_emissions_output.csv` — per-(job, hour) emissions, must contain
  `job_key` (format `"<User>_<start_ns_utc>"`, int64 UTC nanoseconds) and
  `energy_kWh`. Produced upstream by the SLURM emissions joiner.
- `slurm_march_to_october/` — folder of pipe-delimited `sacct` CSV exports.

Step 1 — fit TabPFN and write per-job predictions:

```bash
./.venv/bin/python sherlock-analytics/tabpfn_regression.py \
  --emissions-csv job_emissions_output.csv \
  --sacct-folder slurm_march_to_october \
  --predictions-output tabpfn_energy_predictions.csv
```

Step 2 — aggregate features + predictions into the dashboard JSON:

```bash
./.venv/bin/python sherlock-analytics/generate_insights_json.py \
  --emissions-csv job_emissions_output.csv \
  --sacct-folder slurm_march_to_october \
  --predictions-csv tabpfn_energy_predictions.csv
```

Step 2 writes `sherlock-analytics/public/tabpfn_dashboard_insights.json`
(read by the Next.js `/api/slurm-data` route) and mirrors a copy to the
repo root. Pass `--omit-records` to drop the per-job array if the JSON gets
too large for the dashboard to load comfortably.

This two-step pipeline is the unit a future auto-refresh job (cron, systemd
timer, or CI workflow) will invoke on a schedule.

## Job Prediction API

The Job Forecast tab uses `POST /predict` on the hosted service (`https://energy-estimation-api.vercel.app` by default), with an optional local FastAPI copy in this repo for development.

See `JOB_PREDICTION_API.md` for integration details, `PYTHON_JOB_PREDICTION_URL`, and local run steps.

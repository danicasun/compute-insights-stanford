# Stanford Sherlock Dashboard Insights

This repository contains analysis tools and a Next.js dashboard for the Stanford Sherlock cluster, powered by the `tabpfn_dashboard_insights.json` dataset.

## Overview

The dashboard summarizes job activity, energy usage, queue wait behavior, and temporal patterns using the insights JSON. It also includes a **Job Forecast** mock tab for energy and emissions predictions (UI only, backend integration pending).

## Dashboard (Next.js)

The dashboard lives in `sherlock-analytics/` and reads `tabpfn_dashboard_insights.json`. Current tabs include:
- **Overview**: dataset summary and headline energy/queue stats
- **Energy**: job type breakdown and top energy users
- **Queue & Walltime**: queue wait and requested walltime distributions
- **Users & Accounts**: usage rankings with energy context
- **Temporal**: daily and hour-of-day patterns
- **Job Forecast**: SBATCH paste + structured form to mock energy/emissions predictions
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

## Prediction Mock (UI only)

The Job Forecast tab currently uses a stubbed prediction client in `sherlock-analytics/lib/prediction-client.ts`. The Python prediction service and carbon intensity API integration will be wired later.

"""Generate dashboard-ready JSON insights for TabPFN regression outputs.

Typical invocation from the repository root (paths assume repo-root CWD):

  ./.venv/bin/python sherlock-analytics/generate_insights_json.py \
    --emissions-csv job_emissions_output.csv \
    --sacct-folder slurm_march_to_october \
    --predictions-csv tabpfn_energy_predictions.csv

Writes ``sherlock-analytics/public/tabpfn_dashboard_insights.json`` (the file
the Next.js dashboard reads via ``/api/slurm-data``) and a mirrored copy at
the repo root.

Numeric conventions: energy in kWh, durations in hours, timestamps in UTC
ISO-8601, job counts unitless.
"""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, r2_score, root_mean_squared_error
from tqdm import tqdm

# Allow ``from tabpfn_regression import ...`` to resolve regardless of the
# caller's working directory by adding this file's directory to sys.path.
_HERE = Path(__file__).resolve().parent
if str(_HERE) not in sys.path:
    sys.path.insert(0, str(_HERE))

from tabpfn_regression import FeatureConfig, build_feature_table, load_emissions, load_sacct_files


@dataclass
class DashboardUnits:
    """Units and coordinate frames for dashboard values."""

    energy: str = "kWh"
    duration: str = "hours"
    timestamps: str = "UTC ISO-8601"
    counts: str = "jobs"


def _safe_float(value: float | np.floating) -> float:
    """Convert numpy scalars to plain float for JSON serialization."""
    if isinstance(value, np.floating):
        return float(value)
    return float(value)


def _percentile(values: np.ndarray, percentile_value: float) -> float:
    """Compute percentile with numpy, return float."""
    if len(values) == 0:
        return float("nan")
    return _safe_float(np.percentile(values, percentile_value))


def _timestamp_iso(timestamp: pd.Timestamp | None) -> str | None:
    if timestamp is None or pd.isna(timestamp):
        return None
    if timestamp.tzinfo is None:
        return timestamp.tz_localize(timezone.utc).isoformat()
    return timestamp.isoformat()


def _summarize_series(values: pd.Series) -> Dict[str, float]:
    clean = values.dropna().to_numpy(dtype=float)
    if len(clean) == 0:
        return {
            "count": 0,
            "min": float("nan"),
            "max": float("nan"),
            "mean": float("nan"),
            "median": float("nan"),
            "p95": float("nan"),
        }
    return {
        "count": int(len(clean)),
        "min": _safe_float(np.min(clean)),
        "max": _safe_float(np.max(clean)),
        "mean": _safe_float(np.mean(clean)),
        "median": _safe_float(np.median(clean)),
        "p95": _percentile(clean, 95.0),
    }


def _summarize_predictions(predictions: pd.DataFrame) -> Dict[str, float]:
    y_true = predictions["y_true"].to_numpy(dtype=float)
    y_pred = predictions["y_pred"].to_numpy(dtype=float)
    mae = mean_absolute_error(y_true, y_pred)
    rmse = root_mean_squared_error(y_true, y_pred)
    r2 = r2_score(y_true, y_pred)
    errors = y_pred - y_true
    absolute_percentage_error = np.abs(errors) / np.maximum(np.abs(y_true), 1e-9)
    return {
        "count": int(len(y_true)),
        "mean_absolute_error": _safe_float(mae),
        "root_mean_squared_error": _safe_float(rmse),
        "r2_score": _safe_float(r2),
        "mean_absolute_percentage_error": _safe_float(np.mean(absolute_percentage_error)),
        "error_mean": _safe_float(np.mean(errors)),
        "error_median": _safe_float(np.median(errors)),
        "error_p95_abs": _percentile(np.abs(errors), 95.0),
    }


def _summarize_numeric_columns(df: pd.DataFrame) -> Dict[str, Dict[str, float]]:
    results: Dict[str, Dict[str, float]] = {}
    numeric_df = df.select_dtypes(include=[np.number])
    for col in numeric_df.columns:
        results[col] = _summarize_series(numeric_df[col])
    return results


def _summarize_categorical_columns(
    df: pd.DataFrame,
    max_categories: int = 50,
) -> Dict[str, Dict[str, int]]:
    results: Dict[str, Dict[str, int]] = {}
    for col in df.columns:
        if pd.api.types.is_numeric_dtype(df[col]):
            continue
        counts = df[col].astype(str).fillna("None").value_counts().head(max_categories)
        results[col] = {str(category): int(count) for category, count in counts.items()}
    return results


def _missingness(df: pd.DataFrame) -> Dict[str, int]:
    return {col: int(df[col].isna().sum()) for col in df.columns}


def _dataframe_schema(df: pd.DataFrame) -> Dict[str, str]:
    return {col: str(dtype) for col, dtype in df.dtypes.items()}


def _format_timestamp_columns(df: pd.DataFrame, columns: List[str]) -> pd.DataFrame:
    formatted = df.copy()
    for col in columns:
        if col not in formatted.columns:
            continue
        formatted[col] = pd.to_datetime(formatted[col], errors="coerce", utc=True).apply(_timestamp_iso)
    return formatted


def _sanitize_records(df: pd.DataFrame) -> List[Dict[str, object]]:
    clean = df.replace({np.nan: None})
    records: List[Dict[str, object]] = []
    for row in tqdm(
        clean.itertuples(index=False, name=None),
        total=len(clean),
        desc="Building JSON records",
    ):
        records.append(dict(zip(clean.columns, row)))
    return records


def _job_type_breakdown(features: pd.DataFrame) -> List[Dict[str, float | str | int]]:
    results: List[Dict[str, float | str | int]] = []
    grouped = features.groupby("job_type", dropna=False)
    for job_type, group in grouped:
        energy_values = group["energy_kWh"].to_numpy(dtype=float)
        results.append(
            {
                "job_type": str(job_type),
                "job_count": int(len(group)),
                "energy_total_kwh": _safe_float(np.sum(energy_values)),
                "energy_mean_kwh": _safe_float(np.mean(energy_values)) if len(energy_values) else float("nan"),
            }
        )
    return sorted(results, key=lambda item: item["energy_total_kwh"], reverse=True)


def _top_users_by_energy(features: pd.DataFrame, top_n: int = 10) -> List[Dict[str, float | str | int]]:
    grouped = (
        features.groupby("User", dropna=False)["energy_kWh"]
        .sum()
        .sort_values(ascending=False)
        .head(top_n)
    )
    return [
        {"user": str(user), "energy_total_kwh": _safe_float(total)}
        for user, total in grouped.items()
    ]


def _aggregate_by_column(
    df: pd.DataFrame,
    group_col: str,
) -> List[Dict[str, float | str | int]]:
    grouped = df.groupby(group_col, dropna=False)
    results: List[Dict[str, float | str | int]] = []
    for group_value, group in grouped:
        results.append(
            {
                group_col.lower(): str(group_value),
                "job_count": int(len(group)),
                "energy_total_kwh": _safe_float(group["energy_kWh"].sum()),
                "energy_mean_kwh": _safe_float(group["energy_kWh"].mean()),
                "queue_wait_time_hours_mean": _safe_float(group["queue_wait_time_hours"].mean()),
                "requested_walltime_hours_mean": _safe_float(group["requested_walltime_hours"].mean()),
            }
        )
    return sorted(results, key=lambda item: item["energy_total_kwh"], reverse=True)


def _aggregate_by_time_bucket(
    df: pd.DataFrame,
    timestamp_col: str,
    bucket: str,
) -> List[Dict[str, float | str | int]]:
    if timestamp_col not in df.columns:
        return []
    timestamps = pd.to_datetime(df[timestamp_col], errors="coerce", utc=True)
    if bucket == "day":
        bucket_labels = timestamps.dt.date.astype(str)
    elif bucket == "hour":
        bucket_labels = timestamps.dt.hour.astype("Int64").astype(str)
    else:
        raise ValueError(f"Unsupported time bucket: {bucket}")
    grouped = df.groupby(bucket_labels, dropna=False)
    results: List[Dict[str, float | str | int]] = []
    for bucket_label, group in grouped:
        results.append(
            {
                f"{timestamp_col.lower()}_{bucket}": str(bucket_label),
                "job_count": int(len(group)),
                "energy_total_kwh": _safe_float(group["energy_kWh"].sum()),
                "energy_mean_kwh": _safe_float(group["energy_kWh"].mean()),
            }
        )
    return sorted(results, key=lambda item: item["energy_total_kwh"], reverse=True)


def _aggregate_by_day_hour(df: pd.DataFrame, timestamp_col: str) -> List[Dict[str, Any]]:
    """Per (UTC calendar day, UTC hour-of-day) totals; sparse rows only.

    Uses the same jobs and ``energy_kWh`` as ``_aggregate_by_time_bucket`` (``Start`` in UTC).
    Rows with missing ``Start`` are omitted (cannot assign a 0–23 UTC hour).
    """
    if timestamp_col not in df.columns:
        return []
    timestamps = pd.to_datetime(df[timestamp_col], errors="coerce", utc=True)
    valid = timestamps.notna()
    if not valid.any():
        return []
    sub = df.loc[valid]
    ts = timestamps.loc[valid]
    day_labels = ts.dt.date.astype(str)
    hour_labels = ts.dt.hour.astype(np.int64)
    grouped = sub.groupby([day_labels, hour_labels], dropna=False)
    results: List[Dict[str, Any]] = []
    for (day_label, hour_label), group in grouped:
        energy_sum = _safe_float(group["energy_kWh"].sum())
        job_count = int(len(group))
        if job_count == 0:
            continue
        results.append(
            {
                "start_day": str(day_label),
                "start_hour": int(hour_label),
                "job_count": job_count,
                "energy_total_kwh": energy_sum,
            }
        )
    results.sort(key=lambda r: (r["start_day"], r["start_hour"]))
    return results


def build_insights_json(
    emissions_csv: Path,
    sacct_folder: Path,
    predictions_csv: Path,
    omit_records: bool,
) -> Dict[str, object]:
    config = FeatureConfig()
    emissions = load_emissions(emissions_csv)
    sacct = load_sacct_files(sacct_folder)
    features = build_feature_table(sacct, emissions, config)
    if len(features) == 0:
        raise RuntimeError("No rows after joining sacct and emissions data. Check job_key alignment.")

    predictions = pd.DataFrame()
    if predictions_csv.exists():
        predictions = pd.read_csv(predictions_csv)
        required_cols = {"job_key", "y_true", "y_pred"}
        missing_cols = required_cols - set(predictions.columns)
        if missing_cols:
            raise ValueError(f"predictions CSV missing columns: {', '.join(sorted(missing_cols))}")

    start_time = features["Start"].min()
    end_time = features["End"].max()

    merged = features.copy()
    if not predictions.empty:
        merged = features.merge(predictions, on="job_key", how="left", suffixes=("", "_pred"))
    merged = _format_timestamp_columns(merged, ["Submit", "Start", "End"])
    merged_records = _sanitize_records(merged) if not omit_records else []

    insights = {
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "units": asdict(DashboardUnits()),
        "schema": {
            "features": _dataframe_schema(features),
            "predictions": _dataframe_schema(predictions) if not predictions.empty else {},
            "merged_records": _dataframe_schema(merged),
        },
        "missingness": {
            "features": _missingness(features),
            "predictions": _missingness(predictions) if not predictions.empty else {},
            "merged_records": _missingness(merged),
        },
        "dataset": {
            "job_count": int(len(features)),
            "unique_users": int(features["User"].nunique(dropna=True)),
            "time_range": {
                "start": _timestamp_iso(start_time),
                "end": _timestamp_iso(end_time),
            },
            "energy_kwh": _summarize_series(features["energy_kWh"]),
            "requested_walltime_hours": _summarize_series(features["requested_walltime_hours"]),
            "queue_wait_time_hours": _summarize_series(features["queue_wait_time_hours"]),
        },
        "job_type_breakdown": _job_type_breakdown(features),
        "top_users_by_energy": _top_users_by_energy(features),
        "aggregations": {
            "by_user": _aggregate_by_column(features, "User"),
            "by_account": _aggregate_by_column(features, "Account"),
            "by_state": _aggregate_by_column(features, "State"),
            "by_job_type": _aggregate_by_column(features, "job_type"),
            "by_day": _aggregate_by_time_bucket(features, "Start", "day"),
            "by_hour_of_day": _aggregate_by_time_bucket(features, "Start", "hour"),
            "by_day_hour": _aggregate_by_day_hour(features, "Start"),
        },
        "distributions": {
            "numeric": _summarize_numeric_columns(features),
            "categorical": _summarize_categorical_columns(features),
        },
        "model_performance": _summarize_predictions(predictions) if not predictions.empty else None,
        "records": {
            "columns": list(merged.columns),
            "rows": merged_records,
            "omitted": bool(omit_records),
        },
    }
    return insights


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate JSON insights for dashboard")
    parser.add_argument(
        "--emissions-csv",
        type=Path,
        default=Path("job_emissions_output.csv"),
        help="Path to job_emissions_output.csv",
    )
    parser.add_argument(
        "--sacct-folder",
        type=Path,
        default=Path("slurm_march_to_october"),
        help="Folder containing sacct CSV files",
    )
    parser.add_argument(
        "--predictions-csv",
        type=Path,
        default=Path("tabpfn_energy_predictions.csv"),
        help="Path to predictions CSV from tabpfn_regression.py",
    )
    parser.add_argument(
        "--output-json",
        type=Path,
        default=Path("sherlock-analytics/public/tabpfn_dashboard_insights.json"),
        help="Primary output path for dashboard JSON (Next reads this in sherlock-analytics/public/)",
    )
    parser.add_argument(
        "--sync-repo-root-json",
        type=Path,
        default=Path("tabpfn_dashboard_insights.json"),
        help="Optional second copy at repo root for API/static fallback (same contents).",
    )
    parser.add_argument(
        "--omit-records",
        action="store_true",
        help="Exclude per-job records to reduce output size.",
    )
    args = parser.parse_args()

    insights = build_insights_json(
        emissions_csv=args.emissions_csv,
        sacct_folder=args.sacct_folder,
        predictions_csv=args.predictions_csv,
        omit_records=args.omit_records,
    )
    payload = json.dumps(insights, indent=2)
    args.output_json.parent.mkdir(parents=True, exist_ok=True)
    args.output_json.write_text(payload)
    print(f"Saved dashboard insights to {args.output_json}")
    if args.sync_repo_root_json is not None:
        args.sync_repo_root_json.write_text(payload)
        print(f"Synced dashboard insights to {args.sync_repo_root_json}")


if __name__ == "__main__":
    main()

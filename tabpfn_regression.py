"""TabPFN v2 regression pipeline for SLURM job energy prediction."""

from __future__ import annotations

import argparse
from dataclasses import dataclass
from pathlib import Path
import re
from typing import Dict, Iterable, List, Optional, Tuple

import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error
from sklearn.model_selection import GroupKFold

from tabpfn import TabPFNRegressor


@dataclass
class FeatureConfig:
    """Feature and target configuration."""

    target_col: str = "energy_kWh"
    categorical_cols: Tuple[str, ...] = ("User", "Account", "State", "job_type")


def normalize_mem_to_gb(mem_str: Optional[str]) -> float:
    """Convert memory string (e.g., 12000M, 256G) to GB."""
    if not mem_str or pd.isna(mem_str):
        return 0.0
    mem_str = str(mem_str).strip().upper()
    match = re.match(r"([\d.]+)\s*([GMK]?B?)?", mem_str)
    if not match:
        return 0.0
    value = float(match.group(1))
    unit = match.group(2) or "M"
    if "G" in unit:
        return value
    if "M" in unit:
        return value / 1024.0
    if "K" in unit:
        return value / (1024.0 * 1024.0)
    return value / 1024.0


def parse_alloc_tres(alloc_tres: Optional[str]) -> Dict[str, float]:
    """Parse AllocTRES to numeric CPU, memory (GB), and GPU counts."""
    result = {"alloc_cpu": 0.0, "alloc_mem_gb": 0.0, "alloc_gpu": 0.0}
    if not alloc_tres or pd.isna(alloc_tres):
        return result

    parts = str(alloc_tres).split(",")
    kv = {}
    for part in parts:
        if "=" in part:
            k, v = part.split("=", 1)
            kv[k.strip()] = v.strip()

    if "cpu" in kv:
        try:
            result["alloc_cpu"] = float(kv["cpu"])
        except ValueError:
            result["alloc_cpu"] = 0.0

    if "mem" in kv:
        result["alloc_mem_gb"] = normalize_mem_to_gb(kv["mem"])

    # GPUs can be in "gres/gpu" or "gpu" fields
    gpu_val = None
    if "gres/gpu" in kv:
        gpu_val = kv["gres/gpu"]
    elif "gpu" in kv:
        gpu_val = kv["gpu"]

    if gpu_val is not None:
        try:
            result["alloc_gpu"] = float(gpu_val)
        except ValueError:
            result["alloc_gpu"] = 0.0

    return result


def build_job_key(user: Optional[str], start_ts: pd.Timestamp) -> Optional[str]:
    """Build job key consistent with job_emissions_output.csv format."""
    if not user or pd.isna(user) or pd.isna(start_ts):
        return None
    # Match "YYYY-MM-DD HH:MM:SS" format used in job_emissions_output.csv
    start_str = pd.to_datetime(start_ts).strftime("%Y-%m-%d %H:%M:%S")
    return f"{user}_{start_str}"


def load_sacct_files(folder: Path) -> pd.DataFrame:
    """Load and concatenate sacct CSV files from a folder."""
    csv_files = sorted(folder.glob("*.csv"))
    if not csv_files:
        raise FileNotFoundError(f"No CSV files found in {folder}")

    dfs = []
    for csv_file in csv_files:
        df = pd.read_csv(csv_file, sep="|")
        df.columns = df.columns.str.strip()
        dfs.append(df)

    sacct = pd.concat(dfs, ignore_index=True)
    return sacct


def build_feature_table(
    sacct: pd.DataFrame,
    emissions: pd.DataFrame,
    config: FeatureConfig,
) -> pd.DataFrame:
    """Build feature table by joining sacct and emissions on job_key."""
    # Parse timestamps (mixed formats across sacct files)
    sacct["Submit"] = pd.to_datetime(sacct.get("Submit"), errors="coerce", format="mixed", utc=True)
    sacct["Start"] = pd.to_datetime(sacct.get("Start"), errors="coerce", format="mixed", utc=True)
    sacct["End"] = pd.to_datetime(sacct.get("End"), errors="coerce", format="mixed", utc=True)

    # Build job_key for sacct
    sacct["job_key"] = [
        build_job_key(user, start)
        for user, start in zip(sacct.get("User"), sacct["Start"])
    ]

    # Parse AllocTRES
    alloc_features = sacct.get("AllocTRES").apply(parse_alloc_tres)
    alloc_df = pd.DataFrame(list(alloc_features))
    sacct = pd.concat([sacct, alloc_df], axis=1)

    # Parse ReqMem to GB
    sacct["req_mem_gb"] = sacct.get("ReqMem").apply(normalize_mem_to_gb)

    # Derive job type features
    sacct["is_gpu_job"] = sacct.get("AllocTRES").astype(str).str.contains("gres/gpu|gpu=", na=False)
    sacct["job_type"] = sacct["is_gpu_job"].apply(lambda x: "GPU" if x else "CPU")

    # Time features
    sacct["requested_walltime_hours"] = (sacct["End"] - sacct["Start"]).dt.total_seconds() / 3600.0
    sacct["queue_wait_time_hours"] = (sacct["Start"] - sacct["Submit"]).dt.total_seconds() / 3600.0
    sacct["hour_of_day"] = sacct["Start"].dt.hour
    sacct["day_of_week"] = sacct["Start"].dt.dayofweek

    # Join with target data
    merged = sacct.merge(emissions, on="job_key", how="inner", suffixes=("", "_em"))

    # Filter missing target
    merged = merged[merged[config.target_col].notna()]

    return merged


def load_emissions(csv_path: Path) -> pd.DataFrame:
    """Load emissions CSV and aggregate energy per job."""
    df = pd.read_csv(csv_path)
    if "job_key" not in df.columns:
        raise ValueError("job_emissions_output.csv must include job_key")
    if "energy_kWh" not in df.columns:
        raise ValueError("job_emissions_output.csv must include energy_kWh")

    # Aggregate to job-level energy
    agg = (
        df.groupby("job_key", as_index=False)["energy_kWh"]
        .sum()
        .rename(columns={"energy_kWh": "energy_kWh"})
    )
    return agg


def encode_categoricals(df: pd.DataFrame, cols: Iterable[str]) -> pd.DataFrame:
    """Label-encode categorical columns using pandas categorical codes."""
    df = df.copy()
    for col in cols:
        if col not in df.columns:
            continue
        df[col] = pd.Categorical(df[col]).codes
    return df


def train_and_evaluate(
    features: pd.DataFrame,
    config: FeatureConfig,
    output_predictions: Path,
    n_splits: int = 5,
    max_samples: int = 50_000,
    ignore_pretraining_limits: bool = False,
    random_seed: int = 42,
) -> None:
    """Train TabPFNRegressor with GroupKFold and report MAE/RMSE."""
    # Exclude leakage column
    if "ConsumedEnergyRaw" in features.columns:
        features = features.drop(columns=["ConsumedEnergyRaw"])

    # Prepare model inputs
    feature_cols = [
        "alloc_cpu",
        "alloc_mem_gb",
        "alloc_gpu",
        "NCPUS",
        "req_mem_gb",
        "is_gpu_job",
        "job_type",
        "requested_walltime_hours",
        "queue_wait_time_hours",
        "hour_of_day",
        "day_of_week",
        "User",
        "Account",
        "State",
    ]

    # Keep only available columns and de-duplicate while preserving order
    feature_cols = [c for c in feature_cols if c in features.columns]
    feature_cols = list(dict.fromkeys(feature_cols))

    group_col = "User"
    extra_cols = [config.target_col, "job_key", group_col]
    all_cols = list(dict.fromkeys(feature_cols + extra_cols))

    data = features[all_cols].copy()
    data = encode_categoricals(data, config.categorical_cols)

    # Convert to numeric
    for col in feature_cols:
        data[col] = pd.to_numeric(data[col], errors="coerce")

    data = data.dropna(subset=[config.target_col])

    X = data[feature_cols].to_numpy(dtype=float)
    y = data[config.target_col].to_numpy(dtype=float)
    groups = data["User"].to_numpy()

    # TabPFN has an official sample limit; downsample if needed
    if not ignore_pretraining_limits and len(y) > max_samples:
        rng = np.random.default_rng(random_seed)
        sample_idx = rng.choice(len(y), size=max_samples, replace=False)
        X = X[sample_idx]
        y = y[sample_idx]
        groups = groups[sample_idx]
        data = data.iloc[sample_idx].reset_index(drop=True)

    gkf = GroupKFold(n_splits=n_splits)
    preds = np.zeros_like(y, dtype=float)

    fold_metrics = []
    for fold, (train_idx, test_idx) in enumerate(gkf.split(X, y, groups), start=1):
        model = TabPFNRegressor(ignore_pretraining_limits=ignore_pretraining_limits)
        model.fit(X[train_idx], y[train_idx])
        y_pred = model.predict(X[test_idx])
        preds[test_idx] = y_pred

        mae = mean_absolute_error(y[test_idx], y_pred)
        rmse = mean_squared_error(y[test_idx], y_pred, squared=False)
        fold_metrics.append((mae, rmse))
        print(f"Fold {fold}: MAE={mae:.6f}, RMSE={rmse:.6f}")

    overall_mae = mean_absolute_error(y, preds)
    overall_rmse = mean_squared_error(y, preds, squared=False)
    print(f"\nOverall: MAE={overall_mae:.6f}, RMSE={overall_rmse:.6f}")

    # Save predictions
    pred_df = pd.DataFrame(
        {
            "job_key": data["job_key"],
            "user": data["User"],
            "y_true": y,
            "y_pred": preds,
        }
    )
    pred_df.to_csv(output_predictions, index=False)
    print(f"Saved predictions to {output_predictions}")


def main() -> None:
    parser = argparse.ArgumentParser(description="TabPFN regression for SLURM job energy")
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
        "--predictions-output",
        type=Path,
        default=Path("tabpfn_energy_predictions.csv"),
        help="Path to save predictions CSV",
    )
    parser.add_argument(
        "--max-samples",
        type=int,
        default=50_000,
        help="Max samples to fit (TabPFN official limit is 50k).",
    )
    parser.add_argument(
        "--ignore-pretraining-limits",
        action="store_true",
        help="Allow fitting above TabPFN's official sample limits.",
    )
    parser.add_argument(
        "--random-seed",
        type=int,
        default=42,
        help="Random seed for downsampling.",
    )
    parser.add_argument(
        "--folds",
        type=int,
        default=5,
        help="Number of GroupKFold splits (grouped by User)",
    )
    args = parser.parse_args()

    config = FeatureConfig()

    emissions = load_emissions(args.emissions_csv)
    sacct = load_sacct_files(args.sacct_folder)
    features = build_feature_table(sacct, emissions, config)

    if len(features) == 0:
        raise RuntimeError("No rows after joining sacct and emissions data. Check job_key alignment.")

    train_and_evaluate(
        features,
        config,
        args.predictions_output,
        n_splits=args.folds,
        max_samples=args.max_samples,
        ignore_pretraining_limits=args.ignore_pretraining_limits,
        random_seed=args.random_seed,
    )


if __name__ == "__main__":
    main()

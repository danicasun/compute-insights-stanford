"""TabPFN v2 regression pipeline for SLURM job energy prediction.

Run from the repository root using the project's virtualenv:

  # Cross-validation on a single period (default).
  ./.venv/bin/python sherlock-analytics/tabpfn_regression.py \
    --emissions-csv job_emissions_output.csv \
    --sacct-folder slurm_march_to_october

  # Holdout evaluation with explicit train/test periods (UTC timestamps; energy in kWh).
  ./.venv/bin/python sherlock-analytics/tabpfn_regression.py \
    --train-emissions-csv slurm_march_to_october/job_emissions_output.csv \
    --train-sacct-folder slurm_march_to_october \
    --test-emissions-csv slurm_oct2025_to_jan2026/job_emissions_output.csv \
    --test-sacct-folder slurm_oct2025_to_jan2026 \
    --predictions-output tabpfn_energy_predictions_holdout.csv \
    --test-batch-size 10000

Upstream input ``job_emissions_output.csv`` is produced by the SLURM emissions
joiner (external to this repo at present). It must contain ``job_key`` and
``energy_kWh`` columns; job_key format is ``"<User>_<start_ns_utc>"`` where
``start_ns_utc`` is the int64 UTC nanosecond timestamp of the job ``Start``.
"""

from __future__ import annotations

import argparse
from dataclasses import dataclass
from pathlib import Path
import re
from typing import Dict, Iterable, List, Optional, Tuple

import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, root_mean_squared_error
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
    # Match the int64 UTC timestamp format used in job_emissions_output.csv
    start_utc = pd.to_datetime(start_ts, utc=True)
    if start_utc.tz is not None:
        start_utc = start_utc.tz_convert("UTC")
    start_ns = start_utc.value
    return f"{user}_{start_ns}"


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


def get_feature_columns(features: pd.DataFrame) -> List[str]:
    """Return ordered list of available feature columns."""
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
    feature_cols = [c for c in feature_cols if c in features.columns]
    return list(dict.fromkeys(feature_cols))


def align_feature_columns(
    train_df: pd.DataFrame,
    test_df: pd.DataFrame,
    feature_cols: Iterable[str],
) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """Ensure both train/test have the same feature columns."""
    train_df = train_df.copy()
    test_df = test_df.copy()
    for col in feature_cols:
        if col not in train_df.columns:
            train_df[col] = np.nan
        if col not in test_df.columns:
            test_df[col] = np.nan
    return train_df, test_df


def encode_categoricals_consistently(
    train_df: pd.DataFrame,
    test_df: pd.DataFrame,
    cols: Iterable[str],
) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """Encode categoricals with shared category mapping across train/test."""
    train_df = train_df.copy()
    test_df = test_df.copy()
    for col in cols:
        if col not in train_df.columns and col not in test_df.columns:
            continue
        train_series = train_df[col] if col in train_df.columns else pd.Series([None] * len(train_df))
        test_series = test_df[col] if col in test_df.columns else pd.Series([None] * len(test_df))
        combined = pd.concat([train_series, test_series], ignore_index=True)
        categories = pd.Categorical(combined).categories
        if col in train_df.columns:
            train_df[col] = pd.Categorical(train_df[col], categories=categories).codes
        if col in test_df.columns:
            test_df[col] = pd.Categorical(test_df[col], categories=categories).codes
    return train_df, test_df


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
    feature_cols = get_feature_columns(features)

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
        rmse = root_mean_squared_error(y[test_idx], y_pred)
        fold_metrics.append((mae, rmse))
        print(f"Fold {fold}: MAE={mae:.6f}, RMSE={rmse:.6f}")

    overall_mae = mean_absolute_error(y, preds)
    overall_rmse = root_mean_squared_error(y, preds)
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


def train_and_evaluate_holdout(
    train_features: pd.DataFrame,
    test_features: pd.DataFrame,
    config: FeatureConfig,
    output_predictions: Path,
    max_samples: int = 50_000,
    ignore_pretraining_limits: bool = False,
    random_seed: int = 42,
    test_batch_size: int = 10_000,
) -> None:
    """Train on the train period and report metrics on a holdout period."""
    if "ConsumedEnergyRaw" in train_features.columns:
        train_features = train_features.drop(columns=["ConsumedEnergyRaw"])
    if "ConsumedEnergyRaw" in test_features.columns:
        test_features = test_features.drop(columns=["ConsumedEnergyRaw"])

    feature_cols = get_feature_columns(train_features)
    train_features, test_features = align_feature_columns(
        train_features,
        test_features,
        feature_cols,
    )

    train_features = train_features.dropna(subset=[config.target_col])
    test_features = test_features.dropna(subset=[config.target_col])

    test_job_keys = test_features["job_key"].to_numpy()
    test_users = test_features["User"].to_numpy() if "User" in test_features.columns else None

    train_features, test_features = encode_categoricals_consistently(
        train_features,
        test_features,
        config.categorical_cols,
    )

    for col in feature_cols:
        train_features[col] = pd.to_numeric(train_features[col], errors="coerce")
        test_features[col] = pd.to_numeric(test_features[col], errors="coerce")

    X_train = train_features[feature_cols].to_numpy(dtype=float)
    y_train = train_features[config.target_col].to_numpy(dtype=float)
    X_test = test_features[feature_cols].to_numpy(dtype=float)
    y_test = test_features[config.target_col].to_numpy(dtype=float)

    if not ignore_pretraining_limits and len(y_train) > max_samples:
        rng = np.random.default_rng(random_seed)
        sample_idx = rng.choice(len(y_train), size=max_samples, replace=False)
        X_train = X_train[sample_idx]
        y_train = y_train[sample_idx]

    model = TabPFNRegressor(ignore_pretraining_limits=ignore_pretraining_limits)
    model.fit(X_train, y_train)
    if test_batch_size <= 0:
        raise ValueError("--test-batch-size must be a positive integer")

    if len(X_test) <= test_batch_size:
        y_pred = model.predict(X_test)
    else:
        preds = []
        for start_idx in range(0, len(X_test), test_batch_size):
            end_idx = min(start_idx + test_batch_size, len(X_test))
            preds.append(model.predict(X_test[start_idx:end_idx]))
        y_pred = np.concatenate(preds, axis=0)

    mae = mean_absolute_error(y_test, y_pred)
    rmse = root_mean_squared_error(y_test, y_pred)
    print(f"Holdout: MAE={mae:.6f}, RMSE={rmse:.6f}")

    pred_df = pd.DataFrame(
        {
            "job_key": test_job_keys,
            "user": test_users if test_users is not None else np.array([None] * len(test_job_keys)),
            "y_true": y_test,
            "y_pred": y_pred,
        }
    )
    pred_df.to_csv(output_predictions, index=False)
    print(f"Saved holdout predictions to {output_predictions}")


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
        "--train-emissions-csv",
        type=Path,
        default=None,
        help="Training emissions CSV for holdout evaluation",
    )
    parser.add_argument(
        "--train-sacct-folder",
        type=Path,
        default=None,
        help="Training sacct folder for holdout evaluation",
    )
    parser.add_argument(
        "--test-emissions-csv",
        type=Path,
        default=None,
        help="Holdout emissions CSV for evaluation",
    )
    parser.add_argument(
        "--test-sacct-folder",
        type=Path,
        default=None,
        help="Holdout sacct folder for evaluation",
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
    parser.add_argument(
        "--test-batch-size",
        type=int,
        default=10_000,
        help="Holdout prediction batch size to control memory usage.",
    )
    args = parser.parse_args()

    config = FeatureConfig()

    holdout_requested = any(
        [
            args.train_emissions_csv,
            args.train_sacct_folder,
            args.test_emissions_csv,
            args.test_sacct_folder,
        ]
    )

    if holdout_requested:
        missing_args = [
            name
            for name, value in [
                ("--train-emissions-csv", args.train_emissions_csv),
                ("--train-sacct-folder", args.train_sacct_folder),
                ("--test-emissions-csv", args.test_emissions_csv),
                ("--test-sacct-folder", args.test_sacct_folder),
            ]
            if value is None
        ]
        if missing_args:
            raise ValueError(
                "Holdout evaluation requires all of: "
                + ", ".join(missing_args)
            )

        train_emissions = load_emissions(args.train_emissions_csv)
        train_sacct = load_sacct_files(args.train_sacct_folder)
        train_features = build_feature_table(train_sacct, train_emissions, config)

        test_emissions = load_emissions(args.test_emissions_csv)
        test_sacct = load_sacct_files(args.test_sacct_folder)
        test_features = build_feature_table(test_sacct, test_emissions, config)

        if len(train_features) == 0 or len(test_features) == 0:
            raise RuntimeError(
                "No rows after joining sacct and emissions data. Check job_key alignment."
            )

        train_and_evaluate_holdout(
            train_features,
            test_features,
            config,
            args.predictions_output,
            max_samples=args.max_samples,
            ignore_pretraining_limits=args.ignore_pretraining_limits,
            random_seed=args.random_seed,
            test_batch_size=args.test_batch_size,
        )
    else:
        emissions = load_emissions(args.emissions_csv)
        sacct = load_sacct_files(args.sacct_folder)
        features = build_feature_table(sacct, emissions, config)

        if len(features) == 0:
            raise RuntimeError(
                "No rows after joining sacct and emissions data. Check job_key alignment."
            )

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

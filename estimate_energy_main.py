import pandas as pd
import requests
from datetime import datetime, timedelta
from pathlib import Path
import argparse
import time

TOKEN = "xiXORcxkXP3ggwy4cc2v"
ZONE = "US-CAL-CISO"


def normalize_hour(ts):
    """
    Normalize a timestamp to UTC and round down to the hour boundary.
    
    Args:
        ts: Timestamp (can be timezone-aware or naive, string, or datetime)
    
    Returns:
        pandas.Timestamp in UTC, floored to the hour
    """
    ts = pd.to_datetime(ts, utc=True)
    if ts.tz is None:
        ts = ts.tz_localize("UTC", nonexistent="shift_forward", ambiguous="NaT")
    else:
        ts = ts.tz_convert("UTC")
    return ts.floor("1h")

def read_sacct_file(filepath):
    df = pd.read_csv(filepath, sep="|")

    df.columns = df.columns.str.strip()  # clean column names

    columns_needed = [
        "User",
        "Start",
        "End",
        "ConsumedEnergyRaw",
        "AllocTRES"
    ]
    df = df[columns_needed]

    df["Start"] = pd.to_datetime(df["Start"], errors="coerce")
    df["End"] = pd.to_datetime(df["End"], errors="coerce")

    df = df.dropna(subset=["Start", "End", "ConsumedEnergyRaw"])
    df = df[df["ConsumedEnergyRaw"] > 0]

    df["energy_kWh"] = df["ConsumedEnergyRaw"] / 3_600_000

    # Normalize timestamps to UTC: localize if naive, convert if already timezone-aware
    if df["Start"].dt.tz is None:
        df["Start"] = df["Start"].dt.tz_localize("UTC", nonexistent="shift_forward", ambiguous="NaT")
    else:
        df["Start"] = df["Start"].dt.tz_convert("UTC")
    if df["End"].dt.tz is None:
        df["End"] = df["End"].dt.tz_localize("UTC", nonexistent="shift_forward", ambiguous="NaT")
    else:
        df["End"] = df["End"].dt.tz_convert("UTC")

    # Improved job key using int64 timestamp to prevent accidental duplicate removal
    df["job_key"] = df["User"] + "_" + df["Start"].astype("int64").astype(str)

    df["is_gpu_job"] = df["AllocTRES"].str.contains("gres/gpu", na=False)
    df["job_type"] = df["is_gpu_job"].apply(lambda x: "GPU" if x else "CPU")

    return df

def read_sacct_files_from_folder(folder_path):
    """
    Read multiple sacct CSV files from a folder and combine them.
    Processes all data from the provided files.
    
    Args:
        folder_path: Path to folder containing CSV files
    
    Returns:
        Combined DataFrame with all data from the files
    """
    folder = Path(folder_path)
    if not folder.exists():
        raise ValueError(f"Folder does not exist: {folder_path}")
    
    # Find all CSV files in the folder
    csv_files = list(folder.glob("*.csv"))
    
    if not csv_files:
        raise ValueError(f"No CSV files found in folder: {folder_path}")
    
    print(f"Found {len(csv_files)} CSV file(s) in {folder_path}")
    
    # Read and combine all files
    dfs = []
    for csv_file in csv_files:
        print(f"Reading: {csv_file.name}")
        try:
            df = read_sacct_file(csv_file)
            if len(df) > 0:
                dfs.append(df)
                print(f"  -> {len(df)} jobs loaded")
            else:
                print(f"  -> No jobs found")
        except Exception as e:
            print(f"  -> Error reading {csv_file.name}: {e}")
            continue
    
    if not dfs:
        raise ValueError("No data found in any CSV files")
    
    # Combine all dataframes
    combined_df = pd.concat(dfs, ignore_index=True)
    
    # Remove duplicates based on job_key
    initial_count = len(combined_df)
    combined_df = combined_df.drop_duplicates(subset=["job_key"], keep="first")
    duplicates_removed = initial_count - len(combined_df)
    
    if duplicates_removed > 0:
        print(f"Removed {duplicates_removed} duplicate jobs")
    
    print(f"\nTotal jobs loaded: {len(combined_df)}")
    print(f"Date range: {combined_df['Start'].min()} to {combined_df['Start'].max()}")
    
    return combined_df

def fetch_carbon_intensity_past_range(start, end):
    """
    Fetch carbon intensity data from ElectricityMaps API with retry logic for 429 errors.
    
    Args:
        start: Start datetime (can be string, datetime, or Timestamp)
        end: End datetime (can be string, datetime, or Timestamp)
    
    Returns:
        DataFrame with datetime and ci_g_per_kWh columns, or None on error
    """
    # Ensure start and end are in ISO format
    if isinstance(start, (str, datetime)):
        start = pd.to_datetime(start).isoformat()
    if isinstance(end, (str, datetime)):
        end = pd.to_datetime(end).isoformat()
    
    url = "https://api.electricitymaps.com/v3/carbon-intensity/past-range"
    headers = {"auth-token": TOKEN}
    params = {
        "zone": ZONE,
        "start": start,
        "end": end
    }
    
    r = requests.get(url, headers=headers, params=params)

    # Handle 429 rate limit errors with retry
    if r.status_code == 429:
        print(f"Rate limit (429) encountered, retrying after 2 seconds...")
        time.sleep(2)
        return fetch_carbon_intensity_past_range(start, end)

    if r.status_code == 200:
        data = r.json()
        # Extract data from the response
        ci_df = pd.DataFrame(data["data"])
        # Normalize timestamps to UTC
        ci_df["datetime"] = pd.to_datetime(ci_df["datetime"], utc=True)
        ci_df["datetime"] = ci_df["datetime"].dt.tz_convert("UTC")
        ci_df.rename(columns={"carbonIntensity": "ci_g_per_kWh"}, inplace=True)
        return ci_df[["datetime", "ci_g_per_kWh"]]
    else:
        print("API error:", r.status_code, r.text)
        return None


def distribute_job_emissions_by_hour(df, ci_df):
    """
    Distribute job emissions across all hours the job ran, using the actual
    carbon intensity for each hour.
    
    For each job:
    1. Calculate duration in hours
    2. For each hour the job ran, look up the CI for that hour
    3. Distribute energy consumption uniformly across hours
    4. Calculate emissions for each hour separately
    5. Create one row per job-hour with emissions attributed to the correct date
    
    Args:
        df: DataFrame with job data (Start, End, energy_kWh, etc.)
        ci_df: DataFrame with carbon intensity data (datetime, ci_g_per_kWh)
    
    Returns:
        DataFrame with one row per job-hour, with emissions distributed correctly
    """
    # Ensure timezone-aware datetimes in UTC
    if df["Start"].dt.tz is None:
        df["Start"] = df["Start"].dt.tz_localize("UTC", nonexistent="shift_forward", ambiguous="NaT")
    else:
        df["Start"] = df["Start"].dt.tz_convert("UTC")
    
    if df["End"].dt.tz is None:
        df["End"] = df["End"].dt.tz_localize("UTC", nonexistent="shift_forward", ambiguous="NaT")
    else:
        df["End"] = df["End"].dt.tz_convert("UTC")
    
    # Create hourly CI keys using floor() to ensure alignment
    ci_df = ci_df.copy()
    ci_df["hour"] = ci_df["datetime"].dt.floor("1h")
    ci_dict = dict(zip(ci_df["hour"], ci_df["ci_g_per_kWh"]))
    
    # Sort CI data for imputation
    ci_df_sorted = ci_df.sort_values("hour")
    
    # Expand each job into hourly rows
    expanded_rows = []
    missing_ci_count = 0
    
    for idx, job in df.iterrows():
        # Calculate job duration with normalized hours
        start_hour = normalize_hour(job["Start"])
        end_hour = normalize_hour(job["End"].ceil("1h"))
        
        # Generate all hours the job ran
        current_hour = start_hour
        hours_list = []
        while current_hour < end_hour:
            hours_list.append(current_hour)
            current_hour += pd.Timedelta(hours=1)
        
        if len(hours_list) == 0:
            # Job duration is less than an hour, use the start hour
            hours_list = [start_hour]
        
        # Calculate energy per hour (uniform distribution)
        total_hours = len(hours_list)
        energy_per_hour = job["energy_kWh"] / total_hours if total_hours > 0 else job["energy_kWh"]
        
        # For each hour, calculate emissions using the CI for that hour
        for hour in hours_list:
            # Normalize hour to UTC and floor before lookup
            hour_normalized = normalize_hour(hour)
            
            # Look up CI for this hour
            ci = ci_dict.get(hour_normalized, None)
            
            # Impute missing CI using previous available hour (Option A)
            if ci is None:
                missing_ci_count += 1
                # Find the index of the hour in the sorted CI dataframe
                search_idx = ci_df_sorted["hour"].searchsorted(hour_normalized) - 1
                if search_idx >= 0 and search_idx < len(ci_df_sorted):
                    ci = ci_df_sorted["ci_g_per_kWh"].iloc[search_idx]
                    # Use weighted mean as fallback if still None
                    if pd.isna(ci) and len(ci_df_sorted) > 0:
                        ci = ci_df_sorted["ci_g_per_kWh"].mean()
            
            # Calculate emissions for this hour
            if ci is not None and not pd.isna(ci):
                emissions_kg = (energy_per_hour * ci) / 1000
            else:
                emissions_kg = None
            
            # Create a row for this job-hour
            row = job.copy()
            row["datetime"] = hour_normalized
            row["energy_kWh"] = energy_per_hour
            row["ci_g_per_kWh"] = ci
            row["emissions_kg"] = emissions_kg
            expanded_rows.append(row)
    
    # Warn if CI was missing
    if missing_ci_count > 0:
        print(f"Warning: {missing_ci_count} job-hours had missing CI data, imputed using previous available hour")
    
    # Create DataFrame from expanded rows
    result_df = pd.DataFrame(expanded_rows)
    
    return result_df


def main(data_folder="slurm_march_to_october"):
    """
    Main function to process sacct data from multiple files.
    Properly distributes emissions across all hours/days a job runs,
    using the actual carbon intensity for each hour.
    
    Args:
        data_folder: Path to folder containing CSV files (default: slurm_march_to_october)
    """
    df = read_sacct_files_from_folder(data_folder)

    # Ensure timezone-aware datetimes in UTC (already normalized in read_sacct_file, but ensure here too)
    if df["Start"].dt.tz is None:
        df["Start"] = df["Start"].dt.tz_localize("UTC", nonexistent="shift_forward", ambiguous="NaT")
    else:
        df["Start"] = df["Start"].dt.tz_convert("UTC")
    
    if df["End"].dt.tz is None:
        df["End"] = df["End"].dt.tz_localize("UTC", nonexistent="shift_forward", ambiguous="NaT")
    else:
        df["End"] = df["End"].dt.tz_convert("UTC")
    
    # Determine the date range needed (from earliest job start to latest job end)
    min_start = df["Start"].min() - pd.Timedelta(hours=1)
    max_end = df["End"].max() + pd.Timedelta(hours=1)
    
    print(f"Fetching CI data for range: {min_start} to {max_end}")
    print(f"  (covering all hours that jobs ran)")
    
    # Split into 10-day chunks due to API limit
    ci_dfs = []
    current_start = min_start
    while current_start < max_end:
        current_end = min(current_start + pd.Timedelta(days=10), max_end)
        print(f"Fetching chunk: {current_start} to {current_end}")
        chunk_df = fetch_carbon_intensity_past_range(
            start=current_start.isoformat(),
            end=current_end.isoformat()
        )
        if chunk_df is not None:
            ci_dfs.append(chunk_df)
        current_start = current_end
    
    if not ci_dfs:
        print("No carbon intensity data retrieved")
        return None, None
    
    ci_df = pd.concat(ci_dfs).drop_duplicates(subset=['datetime']).sort_values('datetime')
    
    # Ensure CI timestamps are normalized to UTC and create hourly keys
    ci_df["datetime"] = pd.to_datetime(ci_df["datetime"], utc=True)
    ci_df["datetime"] = ci_df["datetime"].dt.tz_convert("UTC")
    
    print(f"Fetched CI data: {len(ci_df)} records from {ci_df['datetime'].min()} to {ci_df['datetime'].max()}")
    print(f"Job time range: {df['Start'].min()} to {df['End'].max()}")
    
    # Distribute emissions across all hours each job ran
    print(f"\nDistributing emissions across all hours for {len(df)} jobs...")
    df_expanded = distribute_job_emissions_by_hour(df, ci_df)
    
    print(f"Expanded to {len(df_expanded)} job-hour rows")
    print(f"  (average {len(df_expanded)/len(df):.1f} hours per job)")

    # Calculate total emissions
    total_emissions = df_expanded['emissions_kg'].sum()
    total_energy = df_expanded['energy_kWh'].sum()
    jobs_with_emissions = df_expanded['emissions_kg'].notna().sum()
    
    # Calculate weighted average CI for jobs with emissions data
    df_with_ci = df_expanded[df_expanded['ci_g_per_kWh'].notna()]
    if len(df_with_ci) > 0:
        weighted_avg_ci = (df_with_ci['energy_kWh'] * df_with_ci['ci_g_per_kWh']).sum() / df_with_ci['energy_kWh'].sum()
    else:
        weighted_avg_ci = 0
    
    print(f"\n{'='*60}")
    print(f"SUMMARY:")
    print(f"{'='*60}")
    print(f"Total jobs: {len(df)}")
    print(f"Total job-hour rows: {len(df_expanded)}")
    print(f"Job-hours with emissions data: {jobs_with_emissions}")
    print(f"Job-hours without emissions data: {df_expanded['emissions_kg'].isna().sum()}")
    print(f"Total energy consumed: {total_energy:.2f} kWh")
    print(f"Total emissions: {total_emissions:.3f} kg CO2e")
    print(f"Weighted average CI: {weighted_avg_ci:.1f} g CO2e/kWh")
    print(f"{'='*60}")
    
    # Save to CSV
    output_file = "job_emissions_output.csv"
    df_expanded.to_csv(output_file, index=False)
    print(f"\nResults saved to: {output_file}")
    print(f"  Note: Each row represents one hour of a job's runtime")
    print(f"  Emissions are distributed across all days/hours the job ran")
    
    return df_expanded, total_emissions



if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Process sacct data from multiple CSV files")
    parser.add_argument(
        "--data-folder",
        type=str,
        default="slurm_march_to_october",
        help="Path to folder containing CSV files (default: slurm_march_to_october)"
    )
    args = parser.parse_args()
    
    df, total_emissions = main(data_folder=args.data_folder)

import argparse
from pathlib import Path

import pandas as pd
import matplotlib.pyplot as plt


def load_emissions(csv_path: Path) -> pd.DataFrame:
    df = pd.read_csv(csv_path)
    if "datetime" not in df.columns or "emissions_kg" not in df.columns:
        raise ValueError(
            "CSV must contain 'datetime' and 'emissions_kg' columns."
        )
    df["datetime"] = pd.to_datetime(df["datetime"], utc=True, errors="coerce")
    df = df.dropna(subset=["datetime", "emissions_kg"])  # ensure valid rows
    return df


def load_jobs(csv_path: Path) -> pd.DataFrame:
    """Load job data for volume analysis."""
    df = pd.read_csv(csv_path)
    if "Start" not in df.columns:
        raise ValueError("CSV must contain 'Start' column for job volume analysis.")
    if "energy_kWh" not in df.columns:
        raise ValueError("CSV must contain 'energy_kWh' column for energy volume analysis.")
    df["Start"] = pd.to_datetime(df["Start"], errors="coerce")
    df = df.dropna(subset=["Start", "energy_kWh"])  # ensure valid rows
    return df


def plot_daily_emissions(df: pd.DataFrame, output_path: Path) -> None:
    daily = (
        df.set_index("datetime")["emissions_kg"].resample("1D").sum().rename("emissions_kg")
    )

    plt.figure(figsize=(10, 5), dpi=150)
    plt.plot(daily.index, daily.values, marker="o", linewidth=1.5)
    plt.title("Total Emissions per Day")
    plt.xlabel("Date")
    plt.ylabel("Emissions (kg CO₂e)")
    plt.grid(True, linestyle=":", linewidth=0.7, alpha=0.6)
    plt.tight_layout()
    plt.savefig(output_path)
    plt.close()


def plot_hourly_cycle(
    df: pd.DataFrame, output_path: Path, stat: str = "median"
) -> None:
    if stat not in {"median", "mean"}:
        raise ValueError("stat must be 'median' or 'mean'")

    # Use hour-of-day from the datetime column
    hourly = df.copy()
    hourly["hour"] = hourly["datetime"].dt.hour
    agg_func = "median" if stat == "median" else "mean"
    by_hour = hourly.groupby("hour")["emissions_kg"].agg(agg_func)

    # Ensure all 24 hours present
    by_hour = by_hour.reindex(range(24), fill_value=0.0)

    plt.figure(figsize=(10, 5), dpi=150)
    plt.plot(by_hour.index, by_hour.values, marker="o", linewidth=1.5)
    plt.xticks(range(0, 24))
    plt.title(f"Emissions per Hour of Day ({stat.title()})")
    plt.xlabel("Hour of Day (0-23, UTC)")
    plt.ylabel("Emissions (kg CO₂e)")
    plt.grid(True, linestyle=":", linewidth=0.7, alpha=0.6)
    plt.tight_layout()
    plt.savefig(output_path)
    plt.close()


def plot_job_volume_per_hour(df: pd.DataFrame, output_path: Path) -> None:
    """Plot the median energy consumption per hour in a 24-hour period."""
    # Extract hour from Start column
    jobs = df.copy()
    jobs["hour"] = jobs["Start"].dt.hour
    
    # Calculate median energy per hour
    median_energy_per_hour = jobs.groupby("hour")["energy_kWh"].median()
    
    # Ensure all 24 hours present
    median_energy_per_hour = median_energy_per_hour.reindex(range(24), fill_value=0.0)
    
    plt.figure(figsize=(10, 5), dpi=150)
    plt.bar(median_energy_per_hour.index, median_energy_per_hour.values, width=0.8, alpha=0.7)
    plt.xticks(range(0, 24))
    plt.title("Median Energy Consumption per Hour of Day")
    plt.xlabel("Hour of Day (0-23)")
    plt.ylabel("Energy (kWh)")
    plt.grid(True, linestyle=":", linewidth=0.7, alpha=0.6, axis="y")
    plt.tight_layout()
    plt.savefig(output_path)
    plt.close()


def plot_emissions_by_job_type(df: pd.DataFrame, output_path: Path) -> None:
    """Plot emissions breakdown by job type (CPU vs GPU)."""
    if "job_type" not in df.columns:
        raise ValueError("CSV must contain 'job_type' column.")
    
    emissions_by_type = df.groupby("job_type")["emissions_kg"].sum()
    
    plt.figure(figsize=(8, 6), dpi=150)
    colors = ["#3498db", "#e74c3c"]
    plt.pie(
        emissions_by_type.values,
        labels=emissions_by_type.index,
        autopct="%1.1f%%",
        startangle=90,
        colors=colors[:len(emissions_by_type)],
    )
    plt.title("Total Emissions by Job Type")
    plt.tight_layout()
    plt.savefig(output_path)
    plt.close()


def plot_top_users_by_emissions(df: pd.DataFrame, output_path: Path, top_n: int = 15) -> None:
    """Plot top N users by total emissions."""
    if "User" not in df.columns:
        raise ValueError("CSV must contain 'User' column.")
    
    user_emissions = df.groupby("User")["emissions_kg"].sum().sort_values(ascending=False)
    top_users = user_emissions.head(top_n)
    
    plt.figure(figsize=(12, 6), dpi=150)
    plt.barh(range(len(top_users)), top_users.values, alpha=0.7)
    plt.yticks(range(len(top_users)), top_users.index)
    plt.xlabel("Total Emissions (kg CO₂e)")
    plt.title(f"Top {top_n} Users by Total Emissions")
    plt.gca().invert_yaxis()
    plt.grid(True, linestyle=":", linewidth=0.7, alpha=0.6, axis="x")
    plt.tight_layout()
    plt.savefig(output_path)
    plt.close()


def plot_energy_vs_emissions(df: pd.DataFrame, output_path: Path) -> None:
    """Scatter plot of energy vs emissions to show carbon intensity impact."""
    if "energy_kWh" not in df.columns or "emissions_kg" not in df.columns:
        raise ValueError("CSV must contain 'energy_kWh' and 'emissions_kg' columns.")
    
    # Sample if too many points for performance
    plot_df = df.sample(min(10000, len(df))) if len(df) > 10000 else df
    
    plt.figure(figsize=(10, 6), dpi=150)
    ci_values = plot_df["ci_g_per_kWh"] if "ci_g_per_kWh" in plot_df.columns else [200] * len(plot_df)
    scatter = plt.scatter(
        plot_df["energy_kWh"],
        plot_df["emissions_kg"],
        alpha=0.3,
        s=10,
        c=ci_values,
        cmap="viridis",
    )
    plt.xlabel("Energy Consumption (kWh)")
    plt.ylabel("Emissions (kg CO₂e)")
    plt.title("Energy vs Emissions (colored by Carbon Intensity)")
    plt.colorbar(scatter, label="Carbon Intensity (g CO₂e/kWh)")
    plt.grid(True, linestyle=":", linewidth=0.7, alpha=0.6)
    plt.tight_layout()
    plt.savefig(output_path)
    plt.close()


def plot_carbon_intensity_over_time(df: pd.DataFrame, output_path: Path) -> None:
    """Plot median carbon intensity by hour of day (24-hour cycle)."""
    if "datetime" not in df.columns or "ci_g_per_kWh" not in df.columns:
        raise ValueError("CSV must contain 'datetime' and 'ci_g_per_kWh' columns.")
    
    # Extract hour from datetime column
    hourly = df.copy()
    hourly["hour"] = hourly["datetime"].dt.hour
    
    # Calculate median carbon intensity per hour
    by_hour = hourly.groupby("hour")["ci_g_per_kWh"].median()
    
    # Ensure all 24 hours present
    by_hour = by_hour.reindex(range(24), fill_value=0.0)
    
    plt.figure(figsize=(10, 5), dpi=150)
    plt.bar(by_hour.index, by_hour.values, width=0.8, alpha=0.7)
    plt.xticks(range(0, 24))
    plt.title("Median Carbon Intensity by Hour of Day")
    plt.xlabel("Hour of Day (0-23)")
    plt.ylabel("Carbon Intensity (g CO₂e/kWh)")
    plt.grid(True, linestyle=":", linewidth=0.7, alpha=0.6, axis="y")
    plt.tight_layout()
    plt.savefig(output_path)
    plt.close()


def plot_emissions_by_day_of_week(df: pd.DataFrame, output_path: Path) -> None:
    """Plot median emissions by day of week."""
    if "Start" not in df.columns:
        raise ValueError("CSV must contain 'Start' column.")
    
    jobs = df.copy()
    jobs["Start"] = pd.to_datetime(jobs["Start"], errors="coerce")
    jobs["day_of_week"] = jobs["Start"].dt.day_name()
    
    day_order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    emissions_by_day = jobs.groupby("day_of_week")["emissions_kg"].median()
    emissions_by_day = emissions_by_day.reindex(day_order, fill_value=0.0)
    
    plt.figure(figsize=(10, 5), dpi=150)
    plt.bar(emissions_by_day.index, emissions_by_day.values, width=0.7, alpha=0.7)
    plt.title("Median Emissions by Day of Week")
    plt.xlabel("Day of Week")
    plt.ylabel("Median Emissions per Job (kg CO₂e)")
    plt.xticks(rotation=45, ha="right")
    plt.grid(True, linestyle=":", linewidth=0.7, alpha=0.6, axis="y")
    plt.tight_layout()
    plt.savefig(output_path)
    plt.close()


def plot_job_duration_vs_emissions(df: pd.DataFrame, output_path: Path) -> None:
    """Plot job duration vs emissions to identify long-running jobs."""
    if "Start" not in df.columns or "End" not in df.columns or "emissions_kg" not in df.columns:
        raise ValueError("CSV must contain 'Start', 'End', and 'emissions_kg' columns.")
    
    jobs = df.copy()
    jobs["Start"] = pd.to_datetime(jobs["Start"], errors="coerce")
    jobs["End"] = pd.to_datetime(jobs["End"], errors="coerce")
    jobs["duration_hours"] = (jobs["End"] - jobs["Start"]).dt.total_seconds() / 3600
    
    # Filter out invalid durations
    jobs = jobs[(jobs["duration_hours"] > 0) & (jobs["duration_hours"] < 1000)]
    
    # Sample if too many points
    plot_df = jobs.sample(min(10000, len(jobs))) if len(jobs) > 10000 else jobs
    
    plt.figure(figsize=(10, 6), dpi=150)
    plt.scatter(plot_df["duration_hours"], plot_df["emissions_kg"], alpha=0.3, s=10)
    plt.xlabel("Job Duration (hours)")
    plt.ylabel("Emissions (kg CO₂e)")
    plt.title("Job Duration vs Emissions")
    plt.xscale("log")
    plt.yscale("log")
    plt.grid(True, linestyle=":", linewidth=0.7, alpha=0.6)
    plt.tight_layout()
    plt.savefig(output_path)
    plt.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Plot emissions over time from CSV")
    parser.add_argument(
        "--input",
        type=Path,
        default=Path("job_emissions_output.csv"),
        help="Path to input CSV (default: job_emissions_output.csv)",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("emissions_over_time.png"),
        help="Path to save the output plot PNG (default: emissions_over_time.png)",
    )
    parser.add_argument(
        "--hourly-output",
        type=Path,
        default=Path("emissions_by_hour.png"),
        help="Path to save the hourly cycle plot (default: emissions_by_hour.png)",
    )
    parser.add_argument(
        "--hourly-stat",
        choices=["median", "mean"],
        default="median",
        help="Aggregate function for hourly cycle (default: median)",
    )
    parser.add_argument(
        "--job-volume-output",
        type=Path,
        default=Path("job_volume_per_hour.png"),
        help="Path to save the job volume per hour plot (default: job_volume_per_hour.png)",
    )
    parser.add_argument(
        "--all-analytics",
        action="store_true",
        help="Generate all additional analytics plots",
    )
    parser.add_argument(
        "--job-type-output",
        type=Path,
        default=Path("emissions_by_job_type.png"),
        help="Path to save job type breakdown plot",
    )
    parser.add_argument(
        "--top-users-output",
        type=Path,
        default=Path("top_users_by_emissions.png"),
        help="Path to save top users plot",
    )
    parser.add_argument(
        "--energy-emissions-output",
        type=Path,
        default=Path("energy_vs_emissions.png"),
        help="Path to save energy vs emissions scatter plot",
    )
    parser.add_argument(
        "--ci-over-time-output",
        type=Path,
        default=Path("carbon_intensity_over_time.png"),
        help="Path to save carbon intensity over time plot",
    )
    parser.add_argument(
        "--day-of-week-output",
        type=Path,
        default=Path("emissions_by_day_of_week.png"),
        help="Path to save day of week plot",
    )
    parser.add_argument(
        "--duration-emissions-output",
        type=Path,
        default=Path("job_duration_vs_emissions.png"),
        help="Path to save duration vs emissions plot",
    )
    args = parser.parse_args()

    df = load_emissions(args.input)
    plot_daily_emissions(df, args.output)
    print(f"Saved daily emissions plot to {args.output}")
    plot_hourly_cycle(df, args.hourly_output, stat=args.hourly_stat)
    print(f"Saved hourly emissions plot to {args.hourly_output} ({args.hourly_stat})")
    
    # Load jobs data for volume analysis
    jobs_df = load_jobs(args.input)
    plot_job_volume_per_hour(jobs_df, args.job_volume_output)
    print(f"Saved job volume per hour plot to {args.job_volume_output}")
    
    # Additional analytics
    if args.all_analytics:
        print("\nGenerating additional analytics...")
        try:
            plot_emissions_by_job_type(jobs_df, args.job_type_output)
            print(f"Saved job type breakdown to {args.job_type_output}")
        except Exception as e:
            print(f"Error plotting job type: {e}")
        
        try:
            plot_top_users_by_emissions(jobs_df, args.top_users_output)
            print(f"Saved top users plot to {args.top_users_output}")
        except Exception as e:
            print(f"Error plotting top users: {e}")
        
        try:
            plot_energy_vs_emissions(jobs_df, args.energy_emissions_output)
            print(f"Saved energy vs emissions plot to {args.energy_emissions_output}")
        except Exception as e:
            print(f"Error plotting energy vs emissions: {e}")
        
        try:
            plot_carbon_intensity_over_time(df, args.ci_over_time_output)
            print(f"Saved carbon intensity over time to {args.ci_over_time_output}")
        except Exception as e:
            print(f"Error plotting carbon intensity: {e}")
        
        try:
            plot_emissions_by_day_of_week(jobs_df, args.day_of_week_output)
            print(f"Saved day of week plot to {args.day_of_week_output}")
        except Exception as e:
            print(f"Error plotting day of week: {e}")
        
        try:
            plot_job_duration_vs_emissions(jobs_df, args.duration_emissions_output)
            print(f"Saved duration vs emissions plot to {args.duration_emissions_output}")
        except Exception as e:
            print(f"Error plotting duration vs emissions: {e}")


if __name__ == "__main__":
    main()



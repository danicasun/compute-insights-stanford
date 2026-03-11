#!/usr/bin/env python3
"""CLI entry point for emissions estimation tool."""

import argparse
import sys
from datetime import datetime
from pathlib import Path
from typing import Optional

from sbatch_parser import parse_sbatch_file, normalize_memory, parse_time_limit
from slurm_runtime import (
    get_slurm_env_vars,
    get_job_runtime,
    get_node_prefix
)
from zone_mapping import get_zone_for_node_prefix
from electricitymaps import get_carbon_intensity
from power_model import estimate_emissions
from logs import log_to_json, log_to_csv


def preview_mode(sbatch_file: str, zone: Optional[str] = None) -> dict:
    """
    Preview mode: estimate emissions from .sbatch file.
    
    Args:
        sbatch_file: Path to .sbatch file
        zone: Optional zone override
        
    Returns:
        Dictionary with estimation results
    """
    # Parse SBATCH file
    parsed = parse_sbatch_file(sbatch_file)
    
    # Extract values
    cpus_per_task = int(parsed["cpus_per_task"]) if parsed["cpus_per_task"] else 1
    ntasks = int(parsed["ntasks"]) if parsed["ntasks"] else 1
    total_cpus = cpus_per_task * ntasks
    
    mem_per_cpu_value = parsed["mem_per_cpu"]
    if mem_per_cpu_value:
        if isinstance(mem_per_cpu_value, (int, float)):
            mem_per_cpu_gb = float(mem_per_cpu_value)
        else:
            mem_per_cpu_gb = normalize_memory(mem_per_cpu_value)
        total_mem_gb = mem_per_cpu_gb * total_cpus
    else:
        total_mem_gb = 0.0
    
    time_value = parsed["time"]
    if time_value:
        if isinstance(time_value, (int, float)):
            hours = float(time_value)
        else:
            hours = parse_time_limit(time_value)
    else:
        hours = 1.0  # Default 1 hour
    
    # Get zone from nodelist or use provided zone
    nodelist = parsed.get("nodelist")
    if not zone:
        node_prefix = None
        if nodelist:
            # Extract prefix from nodelist
            node_prefix = nodelist.split('-')[0] if '-' in nodelist else nodelist.rstrip('0123456789')
        zone = get_zone_for_node_prefix(node_prefix)
    
    # Get carbon intensity
    carbon_intensity = get_carbon_intensity(zone)
    
    # Calculate emissions
    results = estimate_emissions(total_cpus, total_mem_gb, hours, carbon_intensity)
    
    # Add metadata
    results.update({
        "mode": "preview",
        "sbatch_file": sbatch_file,
        "zone": zone,
        "carbon_intensity_gco2e_per_kwh": carbon_intensity,
        "cpus": total_cpus,
        "mem_gb": total_mem_gb,
        "hours": hours,
        "timestamp": datetime.now().isoformat(),
    })
    
    return results


def live_mode(zone: Optional[str] = None, use_actual_runtime: bool = False) -> dict:
    """
    Live mode: estimate emissions from running Slurm job.
    
    Args:
        zone: Optional zone override
        use_actual_runtime: If True, use actual runtime from scontrol
        
    Returns:
        Dictionary with estimation results
    """
    # Get Slurm environment variables
    env_vars = get_slurm_env_vars()
    
    if not env_vars.get("job_id"):
        raise RuntimeError("Not running in a Slurm job environment")
    
    # Extract values
    cpus_per_task = int(env_vars["cpus_per_task"]) if env_vars["cpus_per_task"] else 1
    ntasks = int(env_vars["ntasks"]) if env_vars["ntasks"] else 1
    total_cpus = cpus_per_task * ntasks
    
    mem_per_cpu_str = env_vars["mem_per_cpu"]
    if mem_per_cpu_str:
        # SLURM_MEM_PER_CPU is in MB
        mem_per_cpu_gb = float(mem_per_cpu_str) / 1024.0
        total_mem_gb = mem_per_cpu_gb * total_cpus
    else:
        total_mem_gb = 0.0
    
    # Get runtime
    if use_actual_runtime:
        hours = get_job_runtime(env_vars["job_id"])
        if hours is None:
            # Fallback to time limit
            time_str = env_vars["time"]
            if time_str:
                hours = parse_time_limit(time_str)
            else:
                hours = 1.0
    else:
        time_str = env_vars["time"]
        if time_str:
            hours = parse_time_limit(time_str)
        else:
            hours = 1.0
    
    # Get zone from nodelist or use provided zone
    if not zone:
        node_prefix = get_node_prefix(env_vars["nodelist"])
        zone = get_zone_for_node_prefix(node_prefix)
    
    # Get carbon intensity
    carbon_intensity = get_carbon_intensity(zone)
    
    # Calculate emissions
    results = estimate_emissions(total_cpus, total_mem_gb, hours, carbon_intensity)
    
    # Add metadata
    results.update({
        "mode": "live",
        "job_id": env_vars["job_id"],
        "zone": zone,
        "carbon_intensity_gco2e_per_kwh": carbon_intensity,
        "cpus": total_cpus,
        "mem_gb": total_mem_gb,
        "hours": hours,
        "nodelist": env_vars["nodelist"],
        "timestamp": datetime.now().isoformat(),
    })
    
    return results


def print_results(results: dict) -> None:
    """Print estimation results to stdout."""
    print("\n" + "="*60)
    print("CARBON EMISSIONS ESTIMATE")
    print("="*60)
    
    if results.get("mode") == "preview":
        print(f"Mode: Preview (from SBATCH file)")
        print(f"SBATCH file: {results.get('sbatch_file', 'N/A')}")
    else:
        print(f"Mode: Live (running job)")
        print(f"Job ID: {results.get('job_id', 'N/A')}")
    
    print(f"\nResource Requirements:")
    print(f"  CPUs: {results.get('cpus', 0)}")
    print(f"  Memory: {results.get('mem_gb', 0):.2f} GB")
    print(f"  Duration: {results.get('hours', 0):.2f} hours")
    
    print(f"\nPower & Energy:")
    print(f"  Power: {results.get('power_watts', 0):.2f} W")
    print(f"  Energy: {results.get('energy_kwh', 0):.4f} kWh")
    
    print(f"\nEmissions:")
    print(f"  Zone: {results.get('zone', 'N/A')}")
    print(f"  Carbon Intensity: {results.get('carbon_intensity_gco2e_per_kwh', 0):.1f} gCO₂e/kWh")
    print(f"  Estimated Emissions: {results.get('emissions_gco2e', 0):.2f} g CO₂e")
    print(f"  Estimated Emissions: {results.get('emissions_kgco2e', 0):.4f} kg CO₂e")
    
    print("="*60 + "\n")


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description="Estimate carbon emissions for Slurm SBATCH jobs",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Preview emissions from SBATCH file
  estimate_emissions --preview job.sbatch
  
  # Estimate emissions for running job
  estimate_emissions --live
  
  # Use actual runtime from scontrol
  estimate_emissions --live --use-actual-runtime
  
  # Override zone
  estimate_emissions --preview job.sbatch --zone US-NY-ISONE
  
  # Log to JSON
  estimate_emissions --preview job.sbatch --log-json emissions.json
        """
    )
    
    mode_group = parser.add_mutually_exclusive_group(required=True)
    mode_group.add_argument(
        "--preview",
        type=str,
        metavar="SBATCH_FILE",
        help="Preview mode: estimate from .sbatch file"
    )
    mode_group.add_argument(
        "--live",
        action="store_true",
        help="Live mode: estimate from running Slurm job"
    )
    
    parser.add_argument(
        "--zone",
        type=str,
        help="Override ElectricityMaps zone (e.g., US-CAL-CISO)"
    )
    
    parser.add_argument(
        "--use-actual-runtime",
        action="store_true",
        help="Use actual runtime from scontrol (live mode only)"
    )
    
    parser.add_argument(
        "--log-json",
        type=str,
        metavar="FILE",
        help="Log results to JSON file"
    )
    
    parser.add_argument(
        "--log-csv",
        type=str,
        metavar="FILE",
        help="Log results to CSV file"
    )
    
    parser.add_argument(
        "--quiet",
        action="store_true",
        help="Suppress output (useful for scripting)"
    )
    
    args = parser.parse_args()
    
    try:
        if args.preview:
            results = preview_mode(args.preview, zone=args.zone)
        else:
            results = live_mode(zone=args.zone, use_actual_runtime=args.use_actual_runtime)
        
        # Print results
        if not args.quiet:
            print_results(results)
        
        # Log to files
        if args.log_json:
            log_to_json(results, args.log_json)
        
        if args.log_csv:
            log_to_csv(results, args.log_csv)
        
        # Exit with success
        sys.exit(0)
    
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()


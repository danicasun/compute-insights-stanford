#!/bin/bash
# Shell script wrapper for emissions estimation tool
# Can be integrated into SBATCH workflows

set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PARENT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Add parent directory to PYTHONPATH so we can import estimate_emissions
export PYTHONPATH="${PARENT_DIR}:${PYTHONPATH}"

# Use virtual environment if it exists
if [ -f "${PARENT_DIR}/venv/bin/activate" ]; then
    source "${PARENT_DIR}/venv/bin/activate"
fi

# Check if running in a Slurm job
if [ -n "$SLURM_JOB_ID" ]; then
    # Live mode: estimate for running job
    python3 -m estimate_emissions.main --live "$@"
else
    # Preview mode: requires SBATCH file argument
    if [ $# -eq 0 ]; then
        echo "Error: No SBATCH file provided for preview mode" >&2
        echo "Usage: $0 <sbatch_file> [options]" >&2
        echo "   or: $0 --live [options] (when running in Slurm job)" >&2
        exit 1
    fi
    
    # Check if first argument is --live flag
    if [ "$1" = "--live" ]; then
        echo "Warning: --live mode requires running in a Slurm job environment" >&2
        exit 1
    fi
    
    # Preview mode with SBATCH file
    python3 -m estimate_emissions.main --preview "$@"
fi


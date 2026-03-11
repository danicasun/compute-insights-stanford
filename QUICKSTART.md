# Quick Start Guide

## Installation

**Option 1: Quick Setup (Recommended)**
```bash
./estimate_emissions/setup.sh
```

**Option 2: Manual Setup**
```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

**Set API Key (Optional)**
```bash
export ELECTRICITYMAPS_API_KEY="your-api-key"
```

## Usage Examples

### Preview Emissions Before Submission

```bash
# Using Python module
python3 -m estimate_emissions.main --preview job.sbatch

# Using shell script
./estimate_emissions/estimate_emissions.sh job.sbatch
```

### Estimate Emissions During Job Execution

Add to your SBATCH script:

```bash
#!/bin/bash
#SBATCH --job-name=my_job
#SBATCH --cpus-per-task=4
#SBATCH --mem-per-cpu=4G
#SBATCH --time=01:00:00

# Estimate emissions (runs in background, doesn't block)
python3 -m estimate_emissions.main --live --quiet --log-json emissions.json &

# Your job commands
python3 my_script.py
```

### Integration Options

**Option 1: Background (Recommended)**
```bash
python3 -m estimate_emissions.main --live --quiet --log-json emissions.json &
```

**Option 2: Quick Check**
```bash
python3 -m estimate_emissions.main --live
```

**Option 3: Preview Before Submit**
```bash
python3 -m estimate_emissions.main --preview job.sbatch
sbatch job.sbatch  # Only if emissions are acceptable
```

## Output Format

The tool prints:
- Resource requirements (CPUs, Memory, Duration)
- Power consumption (Watts)
- Energy consumption (kWh)
- Estimated emissions (g CO₂e and kg CO₂e)
- Carbon intensity for the zone

## Notes

- The tool uses fallback carbon intensity values if the API is unavailable
- Default zone is US-CAL-CISO (can be overridden with `--zone`)
- The tool is designed to be lightweight and non-blocking


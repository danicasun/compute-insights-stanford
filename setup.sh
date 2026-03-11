#!/bin/bash
# Setup script for emissions estimation tool

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PARENT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "Setting up emissions estimation tool..."
echo ""

# Create virtual environment if it doesn't exist
if [ ! -d "${PARENT_DIR}/venv" ]; then
    echo "Creating virtual environment..."
    cd "${PARENT_DIR}"
    python3 -m venv venv
    echo "Virtual environment created."
else
    echo "Virtual environment already exists."
fi

# Activate virtual environment
echo "Activating virtual environment..."
source "${PARENT_DIR}/venv/bin/activate"

# Install dependencies
echo "Installing dependencies..."
pip install -q --upgrade pip
pip install -q -r "${PARENT_DIR}/requirements.txt"

echo ""
echo "Setup complete!"
echo ""
echo "To use the tool:"
echo "  1. Activate the virtual environment: source venv/bin/activate"
echo "  2. Run: python3 -m estimate_emissions.main --preview job.sbatch"
echo ""
echo "Or use the shell script (auto-activates venv if present):"
echo "  ./estimate_emissions/estimate_emissions.sh job.sbatch"
echo ""


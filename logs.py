"""Logging utilities for emissions estimates."""

import json
import csv
from pathlib import Path
from typing import Dict, Optional
from datetime import datetime


def log_to_json(
    data: Dict,
    filepath: str = "emissions_estimate.json",
    append: bool = False
) -> None:
    """
    Log emissions estimate to JSON file.
    
    Args:
        data: Dictionary with emissions data
        filepath: Path to JSON file
        append: If True, append to existing file (as array), else overwrite
    """
    filepath = Path(filepath)
    
    if append and filepath.exists():
        # Read existing data
        with open(filepath, 'r') as f:
            existing = json.load(f)
        
        if isinstance(existing, list):
            existing.append(data)
            data_to_write = existing
        else:
            data_to_write = [existing, data]
    else:
        data_to_write = data
    
    with open(filepath, 'w') as f:
        json.dump(data_to_write, f, indent=2, default=str)


def log_to_csv(
    data: Dict,
    filepath: str = "emissions_estimate.csv",
    append: bool = False
) -> None:
    """
    Log emissions estimate to CSV file.
    
    Args:
        data: Dictionary with emissions data
        filepath: Path to CSV file
        append: If True, append to existing file, else overwrite
    """
    filepath = Path(filepath)
    file_exists = filepath.exists()
    
    # Flatten nested dictionaries for CSV
    flat_data = flatten_dict(data)
    
    mode = 'a' if append and file_exists else 'w'
    with open(filepath, mode, newline='') as f:
        writer = csv.DictWriter(f, fieldnames=flat_data.keys())
        
        if not (append and file_exists):
            writer.writeheader()
        
        writer.writerow(flat_data)


def flatten_dict(d: Dict, parent_key: str = '', sep: str = '_') -> Dict:
    """
    Flatten a nested dictionary.
    
    Args:
        d: Dictionary to flatten
        parent_key: Parent key prefix
        sep: Separator for nested keys
        
    Returns:
        Flattened dictionary
    """
    items = []
    for k, v in d.items():
        new_key = f"{parent_key}{sep}{k}" if parent_key else k
        if isinstance(v, dict):
            items.extend(flatten_dict(v, new_key, sep=sep).items())
        else:
            items.append((new_key, v))
    return dict(items)


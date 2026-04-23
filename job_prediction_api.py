"""FastAPI service for job energy/emissions predictions."""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
import csv
import os
import re
from typing import Any, Dict, List, Optional, Tuple

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from electricitymaps import get_carbon_intensity
from power_model import estimate_emissions
from sbatch_parser import SbatchParameters, parse_sbatch_text
from slurm_runtime import get_node_prefix
from zone_mapping import get_zone_for_node_prefix


class JobPredictionError(Exception):
    """Raised when prediction inputs are invalid."""


class JobPredictionParameters(BaseModel):
    partitionName: Optional[str] = None
    nodeCount: Optional[int] = None
    cpuCores: Optional[int] = None
    gpuCount: Optional[int] = None
    memoryGigabytes: Optional[float] = None
    walltimeHours: Optional[float] = None


class JobPredictionRequest(BaseModel):
    sbatchText: Optional[str] = None
    parameters: Optional[JobPredictionParameters] = None
    zone: Optional[str] = None


class JobPredictionResponse(BaseModel):
    energy_kwh: float
    emissions_kgco2e: float
    emissions_gco2e: float
    power_watts: float
    carbon_intensity_gco2e_per_kwh: float
    pue: float
    zone: str
    calculation_timestamp_utc: str
    inputs: Dict[str, Any]
    notes: List[str]


def _parse_request_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
    sbatch_text = payload.get("sbatchText") or ""
    parameters = payload.get("parameters") or {}

    parsed_sbatch: Optional[SbatchParameters] = None
    if isinstance(sbatch_text, str) and sbatch_text.strip():
        parsed_sbatch = parse_sbatch_text(sbatch_text)

    cpu_cores = _coalesce_int(
        parameters.get("cpuCores"),
        _calculate_total_cpu_cores(parsed_sbatch),
        1,
    )
    gpu_count = _coalesce_int(parameters.get("gpuCount"), parsed_sbatch.gpu_count if parsed_sbatch else None, 0)
    node_count = _coalesce_int(parameters.get("nodeCount"), parsed_sbatch.node_count if parsed_sbatch else None, None)
    partition_name = _coalesce_str(
        parameters.get("partitionName"),
        parsed_sbatch.partition_name if parsed_sbatch else None,
    )

    memory_gigabytes = _coalesce_float(
        parameters.get("memoryGigabytes"),
        _calculate_total_memory_gigabytes(parsed_sbatch, cpu_cores),
        0.0,
    )
    walltime_hours = _coalesce_float(
        parameters.get("walltimeHours"),
        parsed_sbatch.walltime_hours if parsed_sbatch else None,
        1.0,
    )

    zone_override = payload.get("zone")
    if zone_override is not None and not isinstance(zone_override, str):
        raise JobPredictionError("zone must be a string when provided.")

    zone = zone_override or _resolve_zone(parsed_sbatch)

    resolved_nodelist, allocated_node_names = _resolve_nodelist(parsed_sbatch)
    inventory_totals, inventory_missing = _lookup_inventory_totals(allocated_node_names)
    notes: List[str] = []

    if inventory_missing:
        notes.append(
            f"Node inventory missing for {len(inventory_missing)} host(s); fallback assumptions used."
        )

    if inventory_totals:
        cpu_cores = inventory_totals[0]
        gpu_count = inventory_totals[1]

    return {
        "cpu_cores": cpu_cores,
        "gpu_count": gpu_count,
        "node_count": node_count,
        "partition_name": partition_name,
        "memory_gigabytes": memory_gigabytes,
        "walltime_hours": walltime_hours,
        "zone": zone,
        "resolved_nodelist": resolved_nodelist,
        "allocated_node_names": allocated_node_names,
        "notes": notes,
    }


def _calculate_total_cpu_cores(parsed_sbatch: Optional[SbatchParameters]) -> Optional[int]:
    if not parsed_sbatch:
        return None
    cpus_per_task = parsed_sbatch.cpu_cores_per_task
    task_count = parsed_sbatch.task_count
    if cpus_per_task is None:
        return None
    return cpus_per_task * (task_count or 1)


def _calculate_total_memory_gigabytes(
    parsed_sbatch: Optional[SbatchParameters],
    cpu_cores: int,
) -> Optional[float]:
    if not parsed_sbatch:
        return None
    if parsed_sbatch.memory_gigabytes_total is not None:
        return parsed_sbatch.memory_gigabytes_total
    if parsed_sbatch.memory_gigabytes_per_cpu is not None:
        return parsed_sbatch.memory_gigabytes_per_cpu * max(cpu_cores, 1)
    return None


def _resolve_zone(parsed_sbatch: Optional[SbatchParameters]) -> str:
    node_list = parsed_sbatch.nodelist if parsed_sbatch else None
    node_prefix = get_node_prefix(node_list) if node_list else None
    return get_zone_for_node_prefix(node_prefix)


def _coalesce_int(*values: Optional[Any]) -> Optional[int]:
    for value in values:
        if value is None:
            continue
        try:
            return int(value)
        except (TypeError, ValueError):
            raise JobPredictionError("Invalid integer value in request.")
    return None


def _coalesce_float(*values: Optional[Any]) -> Optional[float]:
    for value in values:
        if value is None:
            continue
        try:
            return float(value)
        except (TypeError, ValueError):
            raise JobPredictionError("Invalid numeric value in request.")
    return None


def _coalesce_str(*values: Optional[Any]) -> Optional[str]:
    for value in values:
        if value is None:
            continue
        if not isinstance(value, str):
            raise JobPredictionError("Invalid string value in request.")
        return value
    return None


def _build_prediction_response(inputs: Dict[str, Any]) -> Dict[str, Any]:
    pue = 1.287
    carbon_intensity = get_carbon_intensity(inputs["zone"])
    if carbon_intensity is None:
        carbon_intensity = 0.0

    it_results = estimate_emissions(
        inputs["cpu_cores"],
        inputs["memory_gigabytes"],
        inputs["walltime_hours"],
        carbon_intensity,
    )

    facility_power_watts = it_results["power_watts"] * pue
    facility_energy_kwh = it_results["energy_kwh"] * pue
    facility_emissions_gco2e = facility_energy_kwh * carbon_intensity
    facility_emissions_kgco2e = facility_emissions_gco2e / 1000.0

    notes = list(inputs.get("notes", []))
    if inputs.get("gpu_count", 0) > 0:
        notes.append("GPU power is not included in the current power model.")

    return {
        "energy_kwh": facility_energy_kwh,
        "emissions_kgco2e": facility_emissions_kgco2e,
        "emissions_gco2e": facility_emissions_gco2e,
        "power_watts": facility_power_watts,
        "carbon_intensity_gco2e_per_kwh": carbon_intensity,
        "pue": pue,
        "zone": inputs["zone"],
        "calculation_timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "inputs": {
            "cpu_cores": inputs["cpu_cores"],
            "gpu_count": inputs["gpu_count"],
            "node_count": inputs["node_count"],
            "partition_name": inputs["partition_name"],
            "memory_gigabytes": inputs["memory_gigabytes"],
            "walltime_hours": inputs["walltime_hours"],
            "resolved_nodelist": inputs.get("resolved_nodelist"),
            "allocated_node_names": inputs.get("allocated_node_names", []),
        },
        "notes": notes,
    }


app = FastAPI(title="Job Prediction API")


@app.post("/predict", response_model=JobPredictionResponse)
def predict_job(request: JobPredictionRequest) -> JobPredictionResponse:
    payload = _model_to_dict(request)
    try:
        inputs = _parse_request_payload(payload)
        response_body = _build_prediction_response(inputs)
    except JobPredictionError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover - safeguard
        raise HTTPException(status_code=500, detail=f"Prediction failed: {exc}") from exc

    return JobPredictionResponse(**response_body)


def _model_to_dict(model: BaseModel) -> Dict[str, Any]:
    if hasattr(model, "model_dump"):
        return model.model_dump()
    return model.dict()


def _resolve_nodelist(parsed_sbatch: Optional[SbatchParameters]) -> Tuple[Optional[str], List[str]]:
    if not parsed_sbatch or not parsed_sbatch.nodelist:
        return None, []
    resolved = _expand_nodelist(parsed_sbatch.nodelist)
    return ",".join(resolved) if resolved else parsed_sbatch.nodelist, resolved


def _expand_nodelist(nodelist: str) -> List[str]:
    expanded: List[str] = []
    for part in nodelist.split(","):
        part = part.strip()
        if not part:
            continue
        match = re.match(r"^(?P<prefix>[^\[]+)\[(?P<ranges>[^\]]+)\]$", part)
        if not match:
            expanded.append(part)
            continue
        prefix = match.group("prefix")
        for block in match.group("ranges").split(","):
            if "-" in block:
                start_str, end_str = block.split("-", 1)
                width = max(len(start_str), len(end_str))
                try:
                    start = int(start_str)
                    end = int(end_str)
                except ValueError:
                    continue
                for value in range(start, end + 1):
                    expanded.append(f"{prefix}{value:0{width}d}")
            else:
                expanded.append(f"{prefix}{block}")
    return expanded


def _lookup_inventory_totals(node_names: List[str]) -> Tuple[Optional[Tuple[int, int]], List[str]]:
    if not node_names:
        return None, []

    inventory_path = Path(
        os.environ.get("SHERLOCK_INVENTORY_CSV", "sherlock-analytics/sherlock_all_machines.csv")
    )
    if not inventory_path.exists():
        return None, node_names

    inventory: Dict[str, Tuple[int, int]] = {}
    try:
        with inventory_path.open("r", newline="") as handle:
            reader = csv.DictReader(handle)
            for row in reader:
                node = row.get("node")
                if not node:
                    continue
                try:
                    cpu_count = int(row.get("num_cpus", "0") or 0)
                    gpu_count = int(row.get("num_gpus", "0") or 0)
                except ValueError:
                    continue
                inventory[node] = (cpu_count, gpu_count)
    except OSError:
        return None, node_names

    total_cpus = 0
    total_gpus = 0
    missing: List[str] = []
    for node in node_names:
        if node in inventory:
            cpu_count, gpu_count = inventory[node]
            total_cpus += cpu_count
            total_gpus += gpu_count
        else:
            missing.append(node)

    if total_cpus == 0 and total_gpus == 0:
        return None, missing
    return (total_cpus, total_gpus), missing


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("job_prediction_api:app", host="0.0.0.0", port=8001)

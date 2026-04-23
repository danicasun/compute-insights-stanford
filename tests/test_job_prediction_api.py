import os
from pathlib import Path

from fastapi.testclient import TestClient

import job_prediction_api


def test_prediction_applies_pue_and_inventory(tmp_path: Path, monkeypatch) -> None:
    inventory_path = tmp_path / "sherlock_all_machines.csv"
    inventory_path.write_text(
        "node,num_cpus,num_gpus\n"
        "sh02-01n61,20,0\n"
    )
    monkeypatch.setenv("SHERLOCK_INVENTORY_CSV", str(inventory_path))
    monkeypatch.setattr(job_prediction_api, "get_carbon_intensity", lambda zone: 200.0)

    client = TestClient(job_prediction_api.app)
    response = client.post(
        "/predict",
        json={
            "sbatchText": "#SBATCH --nodelist=sh02-01n61\n#SBATCH --time=01:00:00",
            "parameters": {"memoryGigabytes": 4},
        },
    )

    assert response.status_code == 200
    payload = response.json()

    expected_it_power = 20 * 10.0 + 4 * 0.372
    expected_it_energy = expected_it_power / 1000.0
    expected_facility_energy = expected_it_energy * 1.287
    expected_emissions_g = expected_facility_energy * 200.0

    assert payload["pue"] == 1.287
    assert abs(payload["energy_kwh"] - expected_facility_energy) < 1e-6
    assert abs(payload["emissions_gco2e"] - expected_emissions_g) < 1e-6
    assert payload["inputs"]["resolved_nodelist"] == "sh02-01n61"
    assert payload["inputs"]["allocated_node_names"] == ["sh02-01n61"]

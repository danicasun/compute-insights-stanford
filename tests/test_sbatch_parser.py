import math

from sbatch_parser import parse_walltime_hours


def test_parse_walltime_minutes() -> None:
    assert math.isclose(parse_walltime_hours("10:00"), 10 / 60, rel_tol=1e-6)


def test_parse_walltime_day_hour_format() -> None:
    assert math.isclose(parse_walltime_hours("2-12"), 60.0, rel_tol=1e-6)


def test_parse_walltime_zero_day() -> None:
    assert math.isclose(parse_walltime_hours("0-00"), 0.0, rel_tol=1e-6)

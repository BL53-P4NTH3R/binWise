"""Route optimization helpers for BinWise."""

from math import asin, cos, radians, sin, sqrt
from app.models.bin import Bin


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Return the great-circle distance in kilometres between two coordinates."""
    phi1, phi2       = radians(lat1), radians(lat2)
    delta_phi        = radians(lat2 - lat1)
    delta_lambda     = radians(lon2 - lon1)
    a = sin(delta_phi / 2) ** 2 + cos(phi1) * cos(phi2) * sin(delta_lambda / 2) ** 2
    return 2 * 6371.0 * asin(sqrt(a))


def nearest_neighbour(bins: list[Bin]) -> list[dict]:
    """
    Nearest-neighbour TSP heuristic.
    Starts from the fullest bin, then greedily picks the closest unvisited bin.
    Returns an ordered list of waypoint dicts: [{bin_id, stop_order}, ...]
    """
    if not bins:
        return []

    remaining = bins[:]
    current   = max(remaining, key=lambda b: b.fill_pct)
    remaining.remove(current)
    ordered   = [current]

    while remaining:
        nearest = min(
            remaining,
            key=lambda b: haversine_km(
                current.latitude, current.longitude,
                b.latitude,       b.longitude,
            ),
        )
        remaining.remove(nearest)
        ordered.append(nearest)
        current = nearest

    return [
        {"bin_id": b.id, "stop_order": i + 1}
        for i, b in enumerate(ordered)
    ]


def calculate_total_distance(
    waypoints: list[dict],
    bins: list[Bin],
) -> float:
    """
    Sum haversine distances along an ordered waypoint list.

    Args:
        waypoints: List of dicts with bin_id and stop_order keys,
                   as returned by nearest_neighbour() or simulate_baseline().
        bins:      Full list of Bin objects to look up coordinates from.

    Returns:
        Total route distance in kilometres.
    """
    if len(waypoints) < 2:
        return 0.0

    # Build a lookup map for O(1) coordinate access
    bin_map = {b.id: b for b in bins}

    ordered = sorted(waypoints, key=lambda w: w["stop_order"])

    total = 0.0
    for i in range(len(ordered) - 1):
        a = bin_map.get(ordered[i]["bin_id"])
        b = bin_map.get(ordered[i + 1]["bin_id"])
        if a and b:
            total += haversine_km(a.latitude, a.longitude, b.latitude, b.longitude)
    return total


def simulate_baseline(bins: list[Bin]) -> float:
    """
    Baseline route distance: visit bins in alphabetical bin_code order.
    Simulates the rigid fixed-schedule approach your system replaces.
    Used to populate baseline_distance_km in CollectionRoute records.
    """
    ordered = sorted(bins, key=lambda b: b.bin_code)
    baseline_waypoints = [
        {"bin_id": b.id, "stop_order": i + 1}
        for i, b in enumerate(ordered)
    ]
    return calculate_total_distance(baseline_waypoints, bins)
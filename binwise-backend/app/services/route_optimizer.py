"""Route optimization helpers for BinWise."""

from __future__ import annotations

from math import asin, cos, radians, sin, sqrt

from app.models.bin import Bin


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
	"""Return the great-circle distance in kilometers between two coordinates."""
	phi1 = radians(lat1)
	phi2 = radians(lat2)
	delta_phi = radians(lat2 - lat1)
	delta_lambda = radians(lon2 - lon1)
	a = sin(delta_phi / 2) ** 2 + cos(phi1) * cos(phi2) * sin(delta_lambda / 2) ** 2
	return 2 * 6371.0 * asin(sqrt(a))


def optimize_route(bins: list[Bin]) -> list[dict[str, object]]:
	"""Build a nearest-neighbor collection order starting from the fullest bin."""
	if not bins:
		return []

	remaining = bins[:]
	current = max(remaining, key=lambda bin_item: bin_item.fill_pct)
	remaining.remove(current)
	ordered = [current]

	while remaining:
		next_bin = min(
			remaining,
			key=lambda bin_item: haversine_km(
				current.latitude,
				current.longitude,
				bin_item.latitude,
				bin_item.longitude,
			),
		)
		remaining.remove(next_bin)
		ordered.append(next_bin)
		current = next_bin

	return [{"bin_id": bin_item.id, "stop_order": index + 1} for index, bin_item in enumerate(ordered)]


def calculate_total_distance(bins: list[Bin]) -> float:
	"""Sum the distance between consecutive bins in an ordered route."""
	if len(bins) < 2:
		return 0.0
	return sum(
		haversine_km(
			bins[index].latitude,
			bins[index].longitude,
			bins[index + 1].latitude,
			bins[index + 1].longitude,
		)
		for index in range(len(bins) - 1)
	)


def simulate_baseline(bins: list[Bin]) -> float:
	"""Compute a baseline route distance by visiting bins in bin-code order."""
	ordered = sorted(bins, key=lambda bin_item: bin_item.bin_code)
	return calculate_total_distance(ordered)

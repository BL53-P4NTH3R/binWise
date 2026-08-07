"""WebSocket router streaming live driver and vehicle telemetry for BinWise."""

import asyncio
import json
import random
from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()


def _generate_telemetry(step_counter: int) -> Dict[str, Any]:
	"""Generates realistic simulated telemetry data."""
	base_lat = 11.1485
	base_lng = 7.6402
	# Simulate movement along route
	lat = base_lat + (step_counter * 0.00012) + (random.uniform(-0.00005, 0.00005))
	lng = base_lng + (step_counter * 0.00009) + (random.uniform(-0.00005, 0.00005))
	speed = round(random.uniform(32.0, 48.0), 1)
	battery = max(15.0, round(92.0 - (step_counter * 0.05), 1))
	eta = max(1, 18 - (step_counter // 5))
	dist = max(0.2, round(5.4 - (step_counter * 0.08), 2))
	fill = min(100.0, round(84.0 + (step_counter * 0.2), 1))

	return {
		"type": "telemetry",
		"data": {
			"lat": round(lat, 6),
			"lng": round(lng, 6),
			"speed_kmh": speed,
			"vehicle_battery_pct": battery,
			"route_eta_min": eta,
			"distance_remaining_km": dist,
			"active_bin_fill_pct": fill,
			"timestamp": datetime.now(timezone.utc).isoformat(),
		},
	}


@router.websocket("/v1")
@router.websocket("/v1/")
async def websocket_telemetry_endpoint(websocket: WebSocket):
	"""WebSocket endpoint streaming live vehicle telemetry to drivers every 2s."""
	await websocket.accept()
	step_counter = 0

	async def telemetry_publisher():
		nonlocal step_counter
		try:
			while True:
				telemetry_payload = _generate_telemetry(step_counter)
				await websocket.send_text(json.dumps(telemetry_payload))
				step_counter += 1
				await asyncio.sleep(2.0)
		except (WebSocketDisconnect, RuntimeError, asyncio.CancelledError):
			pass

	async def message_receiver():
		try:
			while True:
				data_text = await websocket.receive_text()
				try:
					payload = json.loads(data_text)
					msg_type = payload.get("type")
					if msg_type == "ping":
						pong_msg = {
							"type": "pong",
							"timestamp": datetime.now(timezone.utc).isoformat(),
						}
						await websocket.send_text(json.dumps(pong_msg))
					elif msg_type == "driver_status":
						ack_msg = {
							"type": "status_ack",
							"status": payload.get("status"),
							"received_at": datetime.now(timezone.utc).isoformat(),
						}
						await websocket.send_text(json.dumps(ack_msg))
				except json.JSONDecodeError:
					pass
		except (WebSocketDisconnect, RuntimeError, asyncio.CancelledError):
			pass

	publisher_task = asyncio.create_task(telemetry_publisher())
	receiver_task = asyncio.create_task(message_receiver())

	try:
		done, pending = await asyncio.wait(
			[publisher_task, receiver_task],
			return_when=asyncio.FIRST_COMPLETED,
		)
		for task in pending:
			task.cancel()
	except (WebSocketDisconnect, RuntimeError, asyncio.CancelledError):
		publisher_task.cancel()
		receiver_task.cancel()

"""Drive the CopilotKit runtime like the browser does and time A2UI first paint.

Usage: uv run python scripts/measure_a2ui.py <agentId> "<text>" [runs]

Prints one JSON line per run: time to the first A2UI surface with components and,
for the JEV agent, one `convert` action round trip on that surface.
"""

import json
import sys
import time
from typing import Any
from uuid import uuid4

import httpx

RUNTIME = "http://localhost:3000/api/copilotkit"


def run(agent_id: str, messages: list[dict[str, Any]], forwarded: dict[str, Any] | None = None) -> dict[str, Any]:
    body = {
        "threadId": str(uuid4()),
        "runId": str(uuid4()),
        "messages": messages,
        "tools": [],
        "context": [],
        "state": {},
        "forwardedProps": forwarded or {},
    }
    envelope = {"method": "agent/run", "params": {"agentId": agent_id}, "body": body}
    started = time.perf_counter()
    first_surface_ms: float | None = None
    operations: list[dict[str, Any]] = []
    types: list[str] = []
    headers = {"accept": "text/event-stream"}
    with httpx.stream("POST", RUNTIME, json=envelope, timeout=180, headers=headers) as response:
        response.raise_for_status()
        for line in response.iter_lines():
            if not line.startswith("data:"):
                continue
            event = json.loads(line[5:])
            types.append(event["type"])
            if event["type"] == "ACTIVITY_SNAPSHOT" and event.get("activityType") == "a2ui-surface":
                ops = (event.get("content") or {}).get("a2ui_operations") or []
                if ops:
                    operations = ops
                    if first_surface_ms is None and any("updateComponents" in op for op in ops):
                        first_surface_ms = (time.perf_counter() - started) * 1000
    return {
        "first_surface_ms": None if first_surface_ms is None else round(first_surface_ms),
        "total_ms": round((time.perf_counter() - started) * 1000),
        "operations": operations,
        "event_types": sorted(set(types)),
    }


def surface_id(operations: list[dict[str, Any]]) -> str | None:
    for op in operations:
        for key in ("createSurface", "updateComponents", "updateDataModel"):
            if key in op:
                return op[key]["surfaceId"]
    return None


def main() -> None:
    agent_id, text = sys.argv[1], sys.argv[2]
    runs = int(sys.argv[3]) if len(sys.argv) > 3 else 1
    for _ in range(runs):
        first = run(agent_id, [{"id": str(uuid4()), "role": "user", "content": text}])
        sid = surface_id(first["operations"])
        report: dict[str, Any] = {
            "agent": agent_id,
            "first_surface_ms": first["first_surface_ms"],
            "total_ms": first["total_ms"],
            "surface_id": sid,
            "event_types": first["event_types"],
        }
        if sid and agent_id == "commandCanvas":
            action = {
                "name": "convert",
                "surfaceId": sid,
                "sourceComponentId": "recompute",
                "context": {"value": "100", "from": ["degree_Celsius"], "to": ["degree_Fahrenheit"]},
            }
            second = run(agent_id, [], {"a2uiAction": {"userAction": action}})
            updates = [op["updateDataModel"] for op in second["operations"] if "updateDataModel" in op]
            report["action_round_trip"] = {
                "total_ms": second["total_ms"],
                "surface_id": updates[0]["surfaceId"] if updates else None,
                "result_text": updates[0]["value"].get("result_text") if updates else None,
            }
        print(json.dumps(report))


if __name__ == "__main__":
    main()

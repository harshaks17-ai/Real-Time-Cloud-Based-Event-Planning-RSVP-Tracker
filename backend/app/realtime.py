import asyncio
import json
from collections import defaultdict

from fastapi import WebSocket


class ConnectionManager:
    """In-memory WebSocket hub: rooms keyed by event_id (cloud pub/sub substitute)."""

    def __init__(self):
        self.rooms: dict[str, set[WebSocket]] = defaultdict(set)
        self.lock = asyncio.Lock()

    async def connect(self, event_id: str, ws: WebSocket):
        await ws.accept()
        async with self.lock:
            self.rooms[event_id].add(ws)

    async def disconnect(self, event_id: str, ws: WebSocket):
        async with self.lock:
            self.rooms[event_id].discard(ws)
            if not self.rooms[event_id]:
                self.rooms.pop(event_id, None)

    async def broadcast(self, event_id: str, message: dict):
        payload = json.dumps(message)
        async with self.lock:
            targets = list(self.rooms.get(event_id, set()))
        dead = []
        for ws in targets:
            try:
                await ws.send_text(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            await self.disconnect(event_id, ws)


manager = ConnectionManager()

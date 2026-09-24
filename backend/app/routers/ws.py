import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from sqlalchemy.orm import Session

from ..database import SessionLocal
from ..models import Event
from ..realtime import manager
from ..services.rsvp_service import compute_counts

router = APIRouter()


@router.websocket("/ws/events/{event_id}")
async def event_ws(websocket: WebSocket, event_id: str, token: str = Query("")):
    """Real-time channel: server pushes count snapshots on every RSVP change."""
    db = SessionLocal()
    try:
        event = db.get(Event, event_id)
        if not event:
            await websocket.close(code=4404)
            return
        await manager.connect(event_id, websocket)
        counts = compute_counts(db, event)
        await websocket.send_text(json.dumps({"type": "counts", **counts}))
        while True:
            await websocket.receive_text()  # keep-alive / ping
    except WebSocketDisconnect:
        pass
    finally:
        await manager.disconnect(event_id, websocket)
        db.close()

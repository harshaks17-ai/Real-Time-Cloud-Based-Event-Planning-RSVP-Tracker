from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import CORS_ORIGINS
from .database import Base, engine
from .routers import auth, events, notifications, ws

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Real-Time Cloud Event Planning & RSVP Tracker API",
    version="1.0.0",
    description="Cloud computing course project: real-time RSVPs, capacity control, analytics.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(events.router)
app.include_router(notifications.router)
app.include_router(ws.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "rsvp-tracker-api"}

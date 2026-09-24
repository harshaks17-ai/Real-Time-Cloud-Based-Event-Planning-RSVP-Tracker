import os
import sys
import tempfile
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# isolate test DB before app import
os.environ["DATABASE_URL"] = "sqlite:///" + tempfile.mktemp(suffix=".db")
os.environ["SECRET_KEY"] = "test-secret-key-0123456789abcdef-0123456789abcdef"

from app.database import Base, engine, SessionLocal  # noqa: E402
from app.main import app  # noqa: E402
from app.models import User, Event, RSVP, EventStatus, RSVPStatus, UserRole  # noqa: E402
from app.security import hash_password, new_id  # noqa: E402


@pytest.fixture()
def client():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with TestClient(app) as c:
        yield c


def register(client, email, password="secret123", name="User", role="attendee"):
    r = client.post("/api/register", json={"email": email, "password": password, "name": name, "role": role})
    assert r.status_code == 201, r.text
    return r.json()


def auth_header(token):
    return {"Authorization": f"Bearer {token}"}


def make_event(client, token, **overrides):
    payload = {
        "name": "Cloud Computing Workshop",
        "description": "Learn cloud concepts",
        "event_type": "workshop",
        "event_date": "2099-12-01",
        "start_time": "10:00",
        "end_time": "13:00",
        "venue": "Hall A",
        "online_link": "",
        "max_capacity": 100,
        "registration_deadline": "2099-11-30",
        "status": "PUBLISHED",
    }
    payload.update(overrides)
    r = client.post("/api/events", json=payload, headers=auth_header(token))
    assert r.status_code == 201, r.text
    return r.json()

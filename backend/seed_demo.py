"""Seed demo users + sample events for the demo. Safe to re-run (skips existing emails)."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import Base, engine, SessionLocal
from app.models import User, Event, EventStatus, UserRole
from app.security import hash_password, new_id

Base.metadata.create_all(bind=engine)
db = SessionLocal()

PW = "Demo@123"

def ensure_user(email, name, role):
    from sqlalchemy import select
    u = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if u:
        return u
    u = User(id=new_id(), email=email, password_hash=hash_password(PW), name=name, role=UserRole(role))
    db.add(u)
    db.commit()
    db.refresh(u)
    print(f"  + user {email} ({role})")
    return u

def ensure_event(org, name, **kw):
    from sqlalchemy import select
    e = db.execute(select(Event).where(Event.organizer_id == org.id, Event.name == name)).scalar_one_or_none()
    if e:
        return e
    payload = dict(
        id=new_id(), organizer_id=org.id, name=name,
        description="", event_type="workshop",
        event_date="2099-12-01", start_time="10:00", end_time="13:00",
        venue="Main Hall", online_link="", max_capacity=100,
        registration_deadline="2099-11-30", status=EventStatus.PUBLISHED,
    )
    payload.update(kw)
    e = Event(**payload)
    db.add(e)
    db.commit()
    db.refresh(e)
    print(f"  + event {name}")
    return e

print("Seeding demo data…")
alice = ensure_user("alice@example.com", "Alice Organizer", "organizer")
bob = ensure_user("bob@example.com", "Bob Attendee", "attendee")
carol = ensure_user("carol@example.com", "Carol Attendee", "attendee")
dave = ensure_user("dave@example.com", "Dave Attendee", "attendee")

ensure_event(alice, "Cloud Computing Workshop",
    description="Hands-on workshop covering IaaS, PaaS, SaaS, real-time databases, and serverless patterns. Bring your laptop!",
    event_type="workshop", venue="Main Auditorium", max_capacity=100,
    event_date="2099-12-01", registration_deadline="2099-11-30")

ensure_event(alice, "TechFest 2099 Keynote",
    description="Annual college tech festival keynote on scalable cloud architecture and AI infrastructure.",
    event_type="fest", venue="Open Air Theatre", max_capacity=500,
    event_date="2099-12-15", registration_deadline="2099-12-14", start_time="09:00", end_time="11:00")

ensure_event(alice, "Kubernetes Deep Dive Webinar",
    description="Online webinar on pods, services, deployments, and autoscaling in production.",
    event_type="webinar", venue="", online_link="https://meet.example.com/k8s-deep-dive",
    max_capacity=250, event_date="2099-11-20", registration_deadline="2099-11-19",
    start_time="18:00", end_time="19:30")

ensure_event(alice, "Cloud Security Masterclass",
    description="Threat modeling, secrets management, zero-trust networking, and compliance for cloud-native apps.",
    event_type="workshop", venue="Lab 302", max_capacity=40,
    event_date="2099-12-20", registration_deadline="2099-11-18",
    start_time="14:00", end_time="17:00")

db.close()
print("\nDone! Demo credentials (password for ALL):", PW)
print("  organizer: alice@example.com")
print("  attendees: bob@example.com, carol@example.com, dave@example.com")

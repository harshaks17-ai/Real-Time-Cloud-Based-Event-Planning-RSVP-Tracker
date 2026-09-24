from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Event, EventStatus, User, Notification, Announcement, RSVP
from ..schemas import (
    EventIn, EventOut, AnnouncementIn, AnnouncementOut, RSVPIn, RSVPOut, CountsOut,
)
from ..security import get_current_user, require_organizer, new_id
from ..services import rsvp_service
from ..services.rsvp_service import RSVPError, compute_counts

router = APIRouter(prefix="/api", tags=["events"])


def _out(event: Event) -> EventOut:
    data = EventOut.model_validate(event)
    data.organizer_name = event.organizer.name if event.organizer else ""
    return data


def _get_owned_event(event_id: str, user: User, db: Session) -> Event:
    event = db.get(Event, event_id)
    if not event:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Event not found")
    if event.organizer_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You do not own this event")
    return event


def _get_event(event_id: str, db: Session) -> Event:
    event = db.get(Event, event_id)
    if not event:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Event not found")
    return event


@router.post("/events", response_model=EventOut, status_code=status.HTTP_201_CREATED)
def create_event(body: EventIn, user: User = Depends(require_organizer), db: Session = Depends(get_db)):
    deadline = datetime.strptime(body.registration_deadline, "%Y-%m-%d").date()
    edate = datetime.strptime(body.event_date, "%Y-%m-%d").date()
    if deadline > edate:
        raise HTTPException(422, "Deadline cannot be after the event date")
    if body.end_time <= body.start_time:
        raise HTTPException(422, "End time must be after start time")
    event = Event(id=new_id(), organizer_id=user.id, **body.model_dump())
    db.add(event)
    db.commit()
    db.refresh(event)
    return _out(event)


@router.get("/events", response_model=list[EventOut])
def list_events(
    status_filter: str | None = None,
    upcoming: bool = False,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = select(Event).order_by(Event.event_date.asc(), Event.start_time.asc())
    if status_filter:
        q = q.where(Event.status == EventStatus(status_filter))
    if upcoming:
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        q = q.where(Event.event_date >= today, Event.status.in_([EventStatus.PUBLISHED, EventStatus.FULL]))
    return [_out(e) for e in db.execute(q).scalars().all()]


@router.get("/events/mine", response_model=list[EventOut])
def my_events(user: User = Depends(require_organizer), db: Session = Depends(get_db)):
    rows = db.execute(select(Event).where(Event.organizer_id == user.id).order_by(Event.created_at.desc())).scalars()
    return [_out(e) for e in rows]


@router.get("/events/{event_id}", response_model=EventOut)
def get_event(event_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return _out(_get_event(event_id, db))


@router.put("/events/{event_id}", response_model=EventOut)
def update_event(
    event_id: str,
    body: EventIn,
    user: User = Depends(require_organizer),
    db: Session = Depends(get_db),
):
    event = _get_owned_event(event_id, user, db)
    if event.status == EventStatus.CANCELLED:
        raise HTTPException(409, "Cannot edit a cancelled event")
    for k, v in body.model_dump().items():
        setattr(event, k, v)
    # never let an edit silently lower capacity below current GOING count
    going = sum(1 for r in event.rsvps if r.status.value == "GOING")
    if event.max_capacity < going:
        raise HTTPException(422, f"Capacity cannot be below current GOING count ({going})")
    if event.going_count >= event.max_capacity and event.status == EventStatus.PUBLISHED:
        event.status = EventStatus.FULL
    db.commit()
    db.refresh(event)
    return _out(event)


@router.delete("/events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(event_id: str, user: User = Depends(require_organizer), db: Session = Depends(get_db)):
    event = _get_owned_event(event_id, user, db)
    db.delete(event)
    db.commit()


@router.post("/events/{event_id}/cancel", response_model=EventOut)
def cancel_event(event_id: str, user: User = Depends(require_organizer), db: Session = Depends(get_db)):
    event = _get_owned_event(event_id, user, db)
    event.status = EventStatus.CANCELLED
    # notify all respondents
    for rsvp in event.rsvps:
        db.add(Notification(
            id=new_id(), user_id=rsvp.user_id, event_id=event.id,
            type="event_cancelled", message=f"Event '{event.name}' has been cancelled.",
        ))
    db.commit()
    db.refresh(event)
    return _out(event)


@router.post("/events/{event_id}/publish", response_model=EventOut)
def publish_event(event_id: str, user: User = Depends(require_organizer), db: Session = Depends(get_db)):
    event = _get_owned_event(event_id, user, db)
    if event.status not in (EventStatus.DRAFT, EventStatus.PUBLISHED):
        raise HTTPException(409, f"Cannot publish from status {event.status.value}")
    event.status = EventStatus.PUBLISHED
    db.commit()
    db.refresh(event)
    return _out(event)


# ---------- announcements ----------

@router.post("/events/{event_id}/announcements", response_model=AnnouncementOut, status_code=201)
def create_announcement(
    event_id: str, body: AnnouncementIn,
    user: User = Depends(require_organizer), db: Session = Depends(get_db),
):
    event = _get_owned_event(event_id, user, db)
    ann = Announcement(id=new_id(), event_id=event.id, title=body.title, message=body.message)
    db.add(ann)
    for rsvp in event.rsvps:
        db.add(Notification(
            id=new_id(), user_id=rsvp.user_id, event_id=event.id,
            type="announcement", message=f"[{event.name}] {body.title}: {body.message}",
        ))
    db.commit()
    db.refresh(ann)
    return ann


@router.get("/events/{event_id}/announcements", response_model=list[AnnouncementOut])
def list_announcements(event_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    event = _get_event(event_id, db)
    return list(event.announcements)


# ---------- rsvp endpoints ----------

def _rsvp_out(r: RSVP) -> RSVPOut:
    out = RSVPOut.model_validate(r)
    if r.user:
        out.user_name = r.user.name
        out.user_email = r.user.email
    return out


@router.post("/events/{event_id}/rsvp", response_model=RSVPOut, status_code=201)
async def create_rsvp(
    event_id: str, body: RSVPIn,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    event = _get_event(event_id, db)
    try:
        rsvp = await rsvp_service.upsert_rsvp(db, event, user, body.status)
    except RSVPError as e:
        raise HTTPException(e.code, e.message)
    return _rsvp_out(rsvp)


@router.put("/events/{event_id}/rsvp", response_model=RSVPOut)
async def update_rsvp(
    event_id: str, body: RSVPIn,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    event = _get_event(event_id, db)
    try:
        rsvp = await rsvp_service.upsert_rsvp(db, event, user, body.status)
    except RSVPError as e:
        raise HTTPException(e.code, e.message)
    return _rsvp_out(rsvp)


@router.delete("/events/{event_id}/rsvp")
async def delete_rsvp(
    event_id: str,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    event = _get_event(event_id, db)
    try:
        return await rsvp_service.cancel_rsvp(db, event, user)
    except RSVPError as e:
        raise HTTPException(e.code, e.message)


@router.get("/events/{event_id}/rsvps", response_model=list[RSVPOut])
def event_rsvps(
    event_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    event = _get_event(event_id, db)
    if event.organizer_id != user.id:
        raise HTTPException(403, "Only the organizer can view the attendee list")
    return [_rsvp_out(r) for r in event.rsvps]


@router.get("/events/{event_id}/counts", response_model=CountsOut)
def event_counts(event_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    event = _get_event(event_id, db)
    return CountsOut(**compute_counts(db, event))


@router.get("/rsvps/me", response_model=list[RSVPOut])
def my_rsvps(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.execute(select(RSVP).where(RSVP.user_id == user.id)).scalars().all()
    return [_rsvp_out(r) for r in rows]


# ---------- analytics ----------

@router.get("/events/{event_id}/analytics")
def analytics(event_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from ..services.analytics_service import event_analytics
    event = _get_event(event_id, db)
    if event.organizer_id != user.id:
        raise HTTPException(403, "Only the organizer can view analytics")
    return event_analytics(db, event)

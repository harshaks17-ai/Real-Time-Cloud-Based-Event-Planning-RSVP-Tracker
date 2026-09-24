"""RSVP + capacity service.

Concurrency-safe seat reservation:
  UPDATE events SET going_count = going_count + 1
   WHERE id = :event_id AND going_count < max_capacity

SQLite/PostgreSQL row-level locking guarantees only one writer can claim the
last seat — a check-then-insert in application code would race.
"""
from datetime import datetime, timezone

from sqlalchemy import update, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..models import Event, EventStatus, RSVP, RSVPStatus, WaitlistEntry, Notification, User, AuditLog
from ..realtime import manager
from ..security import new_id


class RSVPError(Exception):
    def __init__(self, message: str, code: int = 400):
        self.message = message
        self.code = code
        super().__init__(message)


def _notify(db: Session, user_id: str, event_id: str, ntype: str, message: str):
    db.add(Notification(id=new_id(), user_id=user_id, event_id=event_id, type=ntype, message=message))


def _audit(db: Session, user_id: str | None, action: str, detail: str = ""):
    db.add(AuditLog(id=new_id(), user_id=user_id, action=action, detail=detail))


async def publish_counts(db: Session, event_id: str):
    event = db.get(Event, event_id)
    if not event:
        return
    counts = compute_counts(db, event)
    await manager.broadcast(event_id, {"type": "counts", **counts})


def compute_counts(db: Session, event: Event) -> dict:
    rows = db.execute(
        select(RSVP.status, func.count()).where(RSVP.event_id == event.id).group_by(RSVP.status)
    ).all()
    by_status = {s: c for s, c in rows}
    going = by_status.get(RSVPStatus.GOING, 0)
    maybe = by_status.get(RSVPStatus.MAYBE, 0)
    not_going = by_status.get(RSVPStatus.NOT_GOING, 0)
    waitlisted = by_status.get(RSVPStatus.WAITLISTED, 0)
    total_responses = going + maybe + not_going + waitlisted
    invited = db.scalar(select(func.count()).select_from(User)) or 0
    return {
        "going": going,
        "maybe": maybe,
        "not_going": not_going,
        "waitlisted": waitlisted,
        "capacity": event.max_capacity,
        "available": max(0, event.max_capacity - going),
        "total_responses": total_responses,
        "total_invited": invited,
        "response_rate": round((total_responses / invited * 100), 1) if invited else 0.0,
    }


def _validate_event_open(event: Event):
    if event.status == EventStatus.CANCELLED:
        raise RSVPError("Event is cancelled", 409)
    if event.status == EventStatus.COMPLETED:
        raise RSVPError("Event has ended", 409)
    if event.status == EventStatus.DRAFT:
        raise RSVPError("Event is not published", 409)
    today = datetime.now(timezone.utc).date()
    deadline = datetime.strptime(event.registration_deadline, "%Y-%m-%d").date()
    if today > deadline:
        raise RSVPError("Registration deadline passed", 409)


def _claim_seat(db: Session, event_id: str) -> bool:
    """Atomic conditional write — returns True if a seat was claimed."""
    result = db.execute(
        update(Event)
        .where(Event.id == event_id, Event.going_count < Event.max_capacity, Event.status != EventStatus.FULL)
        .values(going_count=Event.going_count + 1)
    )
    if result.rowcount == 1:
        event = db.get(Event, event_id)
        if event and event.going_count >= event.max_capacity:
            event.status = EventStatus.FULL
        return True
    return False


def _release_seat(db: Session, event_id: str):
    db.execute(
        update(Event)
        .where(Event.id == event_id)
        .values(going_count=Event.going_count - 1)
    )
    event = db.get(Event, event_id)
    if event and event.status == EventStatus.FULL and event.going_count < event.max_capacity:
        event.status = EventStatus.PUBLISHED


def _promote_from_waitlist(db: Session, event: Event):
    """FIFO promotion when a seat frees up."""
    if event.going_count >= event.max_capacity:
        return
    entry = (
        db.query(WaitlistEntry)
        .filter(WaitlistEntry.event_id == event.id)
        .order_by(WaitlistEntry.position.asc(), WaitlistEntry.joined_at.asc())
        .first()
    )
    if not entry:
        return
    rsvp = db.execute(
        select(RSVP).where(RSVP.event_id == event.id, RSVP.user_id == entry.user_id)
    ).scalar_one_or_none()
    if rsvp and rsvp.status == RSVPStatus.WAITLISTED:
        if _claim_seat(db, event.id):
            rsvp.status = RSVPStatus.GOING
            rsvp.updated_at = datetime.now(timezone.utc)
            _notify(db, entry.user_id, event.id, "waitlist_promoted",
                    f"You're IN! A seat opened up for '{event.name}'.")
    db.delete(entry)


async def upsert_rsvp(db: Session, event: Event, user: User, status: RSVPStatus) -> RSVP:
    """Create or update the user's single active RSVP for this event."""
    _validate_event_open(event)

    existing = db.execute(
        select(RSVP).where(RSVP.event_id == event.id, RSVP.user_id == user.id)
    ).scalar_one_or_none()

    prev_status = existing.status if existing else None
    final_status = status
    waitlisted_now = False

    try:
        if status == RSVPStatus.GOING:
            if existing and existing.status == RSVPStatus.GOING:
                pass  # already going — idempotent
            else:
                # free previous seat if switching MAYBE/NOT_GOING -> GOING needs none,
                # but WAITLISTED -> GOING should claim a seat
                claimed = _claim_seat(db, event.id)
                if claimed:
                    # leaving waitlist if present
                    wl = db.execute(
                        select(WaitlistEntry).where(
                            WaitlistEntry.event_id == event.id, WaitlistEntry.user_id == user.id
                        )
                    ).scalar_one_or_none()
                    if wl:
                        db.delete(wl)
                else:
                    final_status = RSVPStatus.WAITLISTED
                    waitlisted_now = True

        elif status in (RSVPStatus.MAYBE, RSVPStatus.NOT_GOING):
            if existing and existing.status == RSVPStatus.GOING:
                _release_seat(db, event.id)
            # remove from waitlist — user chose another response
            wl = db.execute(
                select(WaitlistEntry).where(
                    WaitlistEntry.event_id == event.id, WaitlistEntry.user_id == user.id
                )
            ).scalar_one_or_none()
            if wl:
                db.delete(wl)

        if existing:
            existing.status = final_status
            existing.updated_at = datetime.now(timezone.utc)
            rsvp = existing
        else:
            rsvp = RSVP(id=new_id(), event_id=event.id, user_id=user.id, status=final_status)
            db.add(rsvp)

        if final_status == RSVPStatus.WAITLISTED and not waitlisted_now:
            pass
        if final_status == RSVPStatus.WAITLISTED:
            max_pos = db.scalar(
                select(func.max(WaitlistEntry.position)).where(WaitlistEntry.event_id == event.id)
            ) or 0
            has_wl = db.execute(
                select(WaitlistEntry).where(
                    WaitlistEntry.event_id == event.id, WaitlistEntry.user_id == user.id
                )
            ).scalar_one_or_none()
            if not has_wl:
                db.add(WaitlistEntry(id=new_id(), event_id=event.id, user_id=user.id, position=max_pos + 1))

        _notify(db, user.id, event.id, "rsvp_confirmation",
                f"Your RSVP for '{event.name}' is confirmed: {final_status.value}.")
        _audit(db, user.id, "rsvp_upsert", f"{event.id}:{prev_status}->{final_status.value}")
        db.commit()
        db.refresh(rsvp)
    except IntegrityError:
        db.rollback()
        raise RSVPError("Duplicate RSVP rejected by unique constraint", 409)
    except Exception:
        db.rollback()
        raise

    await publish_counts(db, event.id)
    return rsvp


async def cancel_rsvp(db: Session, event: Event, user: User) -> dict:
    existing = db.execute(
        select(RSVP).where(RSVP.event_id == event.id, RSVP.user_id == user.id)
    ).scalar_one_or_none()
    if not existing:
        raise RSVPError("No RSVP found", 404)

    was_going = existing.status == RSVPStatus.GOING
    db.delete(existing)
    wl = db.execute(
        select(WaitlistEntry).where(WaitlistEntry.event_id == event.id, WaitlistEntry.user_id == user.id)
    ).scalar_one_or_none()
    if wl:
        db.delete(wl)
    if was_going:
        _release_seat(db, event.id)
    _audit(db, user.id, "rsvp_cancel", event.id)
    db.commit()

    if was_going:
        ev = db.get(Event, event.id)
        _promote_from_waitlist(db, ev)
        db.commit()

    await publish_counts(db, event.id)
    return {"cancelled": True}

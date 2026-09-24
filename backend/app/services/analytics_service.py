from sqlalchemy import select, func
from sqlalchemy.orm import Session

from ..models import Event, RSVP, RSVPStatus, WaitlistEntry, User
from ..schemas import AnalyticsOut


def event_analytics(db: Session, event: Event) -> AnalyticsOut:
    rows = db.execute(
        select(RSVP.status, func.count()).where(RSVP.event_id == event.id).group_by(RSVP.status)
    ).all()
    by = {s: c for s, c in rows}
    going = by.get(RSVPStatus.GOING, 0)
    maybe = by.get(RSVPStatus.MAYBE, 0)
    not_going = by.get(RSVPStatus.NOT_GOING, 0)
    waitlisted = by.get(RSVPStatus.WAITLISTED, 0)
    total = going + maybe + not_going + waitlisted
    invited = db.scalar(select(func.count()).select_from(User)) or 0
    waitlist_count = db.scalar(
        select(func.count()).select_from(WaitlistEntry).where(WaitlistEntry.event_id == event.id)
    ) or 0

    growth_rows = db.execute(
        select(RSVP.responded_at, RSVP.status)
        .where(RSVP.event_id == event.id)
        .order_by(RSVP.responded_at.asc())
    ).all()
    growth, running = [], {"going": 0, "maybe": 0, "not_going": 0, "waitlisted": 0}
    for ts, st in growth_rows:
        key = {
            RSVPStatus.GOING: "going",
            RSVPStatus.MAYBE: "maybe",
            RSVPStatus.NOT_GOING: "not_going",
            RSVPStatus.WAITLISTED: "waitlisted",
        }[st]
        running[key] += 1
        growth.append({"ts": ts.isoformat(), **running})

    return AnalyticsOut(
        event_id=event.id,
        going=going,
        maybe=maybe,
        not_going=not_going,
        waitlisted=waitlisted,
        capacity=event.max_capacity,
        available_seats=max(0, event.max_capacity - going),
        capacity_utilization=round(going / event.max_capacity * 100, 1) if event.max_capacity else 0.0,
        response_rate=round(total / invited * 100, 1) if invited else 0.0,
        total_responses=total,
        growth=growth,
    )

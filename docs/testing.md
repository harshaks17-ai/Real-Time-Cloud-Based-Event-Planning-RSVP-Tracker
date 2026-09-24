# Testing Strategy

Run: `cd backend && python -m pytest -q`

## Manual / Exploratory matrix

| ID | Scenario | Input | Expected | Automated? |
|----|----------|-------|----------|------------|
| T01 | User registration | valid payload | 201 + JWT | ✅ |
| T02 | Duplicate registration | same email twice | 409 | ✅ |
| T03 | Login success | correct credentials | 200 + JWT | ✅ |
| T04 | Login failure | wrong password | 401 | ✅ |
| T05 | Organizer creates event | valid event | 201 PUBLISHED | ✅ |
| T06 | Attendee cannot create event | attendee JWT | 403 | ✅ |
| T07 | Event validation | deadline > date | 422 | ✅ |
| T08 | Get event | valid id | 200 | ✅ |
| T09 | Valid RSVP GOING | attendee JWT | 201, counts going=1 | ✅ |
| T10 | Duplicate RSVP upsert | POST twice | 1 record only | ✅ |
| T11 | Update GOING → MAYBE | PUT | going=0 maybe=1 | ✅ |
| T12 | Update MAYBE → GOING | PUT | going=1 maybe=0 | ✅ |
| T13 | Cancel RSVP | DELETE | counts zeroed | ✅ |
| T14 | Registration deadline | deadline in past | 409 | ✅ |
| T15 | Capacity enforcement | cap=1, 2 users | 1 GOING + 1 WAITLISTED, FULL | ✅ |
| T16 | Simultaneous final seat | 8 parallel GOING, cap=1 | exactly 1 GOING | ✅ |
| T17 | Waitlist FIFO promotion | cancel GOING with waiter | waiter promoted | ✅ |
| T18 | Owner-only attendee list | other organizer | 403 | ✅ |
| T19 | Owner-only analytics | other organizer | 403 | ✅ |
| T20 | Unauthorized event modify | non-owner PUT/DELETE | 403 | ✅ |
| T21 | Announcement → notifications | post announcement | attendee bell has item | ✅ |
| T22 | Mark notification read | PUT read | is_read=true | ✅ |
| T23 | Event cancellation | POST cancel | CANCELLED + notify + block RSVP | ✅ |
| T24 | Analytics calculation | 4 RSVPs mixed | counts/utilization correct | ✅ |
| T25 | Invalid token | garbage JWT | 401 | ✅ |
| T26 | Real-time WS broadcast | RSVP while WS open | push with going=1 | ✅ |

## Failure-injection checks (manual)

- Kill backend mid-session → frontend shows RECONNECTING, recovers on restart (backoff)
- Revoke/corrupt token → 401 → redirect to login
- Double-click RSVP button → still one DB row (upsert + unique constraint)

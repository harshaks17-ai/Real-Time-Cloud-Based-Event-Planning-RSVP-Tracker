# Real-Time Cloud-Based Event Planning & RSVP Tracker

A cloud-native event management platform where organizers create events, attendees RSVP in real time, capacity is enforced race-condition-safe, and dashboards update live over WebSockets — built as a Cloud Computing course project with free-tier / local-first services.

![Architecture](docs/architecture.md)

---

## Overview

Organizers create events, publish them, track live Going / Maybe / Not Going counts, manage waitlists, and post announcements. Attendees register, discover events, RSVP, and receive in-app notifications — all backed by a cloud-style REST API + WebSocket realtime channel.

## Problem Statement

Spreadsheets and chat groups break down for events: duplicate entries, no live headcount, overbooking when the last seat is claimed twice, and no automated check-in or reminders. This project solves that with a centrally hosted, real-time, capacity-aware RSVP system.

## Objectives

1. Cloud-hosted REST API with authentication and role-based authorization
2. Real-time RSVP count propagation to organizer dashboards (WebSockets)
3. Concurrency-safe capacity enforcement (atomic conditional writes)
4. FIFO waitlist with automatic promotion
5. Announcements, in-app notifications, and analytics
6. Automated test suite covering auth, RSVP, capacity, races, security

## Features

| Role | Capabilities |
|------|-------------|
| **Attendee** | Register/login, discover events, RSVP (GOING/MAYBE/NOT_GOING), update or cancel RSVP, view own RSVPs, receive notifications |
| **Organizer** | Create/edit/delete/cancel events, set capacity & deadline, view attendees, live analytics, publish announcements |
| **System** | Real-time count broadcast, capacity limit → FULL status, waitlist promotion, audit logs, deadline enforcement |

## Industry Relevance

Same architecture patterns as Eventbrite, Cvent, Splash, and Hopin: unique event records, centralized RSVP store, live dashboards, capacity control, and reminder/announcement fan-out. Used across conferences, college festivals, corporate events, webinars, weddings, and meetups.

## Cloud Computing Concepts Demonstrated

| Concept | Where in this project |
|---------|----------------------|
| Cloud-hosted app | FastAPI service deployable to Render/Railway/Cloud Run; React build to Vercel/Netlify/Firebase Hosting |
| SaaS | Multi-tenant event platform consumed via browser |
| PaaS | Managed Python/Node runtimes; no server patching |
| Cloud database | SQLAlchemy layer — SQLite locally, PostgreSQL on any cloud (set `DATABASE_URL`) |
| Real-time database / WebSockets | `/ws/events/{id}` pushes count snapshots on every RSVP write |
| Authentication | JWT bearer tokens (HS256), PBKDF2 password hashing |
| Authorization / RBAC | `attendee` vs `organizer` roles; owner-only mutation checks |
| REST APIs | Full `/api/*` surface (events, rsvps, analytics, announcements, notifications) |
| Serverless (pattern) | Pure stateless request handlers; manager is the only in-memory state |
| Event-driven architecture | RSVP write → count recompute → WebSocket broadcast → dashboards |
| Scalability / elasticity | Stateless API + horizontal replicas; swap in-memory hub for Redis pub/sub |
| High availability | Auto-reconnect with exponential backoff in `useEventSocket` |
| Caching (pattern) | `going_count` denormalized on `events` row for O(1) capacity checks |
| Secrets management | All config via environment variables (`.env.example`) |
| Logging / monitoring | FastAPI access layer + `audit_logs` table for RSVP/cancel actions |
| CI/CD | GitHub Actions workflow in `.github/workflows/ci.yml` |
| Failure handling | Transactions with rollback, unique constraints, idempotent upsert RSVP |

## Real-Time Architecture

```
Attendee A ─┐
Attendee B ─┼─► REST /api/.../rsvp ─► DB transaction (atomic seat claim)
Attendee C ─┘                               │
                                            ▼
                                  recompute counts
                                            │
                                            ▼
                              WebSocket broadcast /ws/events/{id}
                                            │
                                            ▼
                              Organizer dashboard updates live
```

## Technology Stack

| Layer | Choice | Notes |
|-------|--------|-------|
| Frontend | React 18 + Vite + React Router | Lightweight, fast HMR |
| Backend | Python FastAPI + SQLAlchemy 2 | Async-ready, OpenAPI docs at `/docs` |
| Database | SQLite (local) / PostgreSQL (cloud) | Swap via `DATABASE_URL` |
| Real-time | Native WebSockets | Auto-reconnect client |
| Auth | PyJWT + PBKDF2 (stdlib) | No paid services required |
| Tests | pytest + FastAPI TestClient | 26 automated tests |

**Other options considered:** Option A (Flask+SQLite+polling) — simpler but no true realtime; Option C (AWS CloudFront + API Gateway + Lambda + DynamoDB + Cognito) — enterprise-grade but costs/complexity beyond student free tier. This repo implements **Option B** (recommended).

## User Roles

| Permission | Attendee | Organizer |
|-----------|:--------:|:---------:|
| Register / login | ✅ | ✅ |
| View events | ✅ | ✅ |
| RSVP / update / cancel own | ✅ | ✅ |
| Create / edit / delete / cancel events | ❌ | ✅ (own only) |
| View attendee list & analytics | ❌ | ✅ (own only) |
| Post announcements | ❌ | ✅ (own only) |

## REST APIs

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/register` | — | Create account |
| POST | `/api/login` | — | Get JWT |
| GET | `/api/me` | JWT | Current user |
| POST | `/api/events` | Organizer | Create event |
| GET | `/api/events` | JWT | List events |
| GET | `/api/events/mine` | Organizer | Own events |
| GET | `/api/events/{id}` | JWT | Event detail |
| PUT | `/api/events/{id}` | Owner | Update event |
| DELETE | `/api/events/{id}` | Owner | Delete event |
| POST | `/api/events/{id}/cancel` | Owner | Cancel + notify |
| POST | `/api/events/{id}/publish` | Owner | Draft → published |
| POST | `/api/events/{id}/rsvp` | JWT | Create/upsert RSVP |
| PUT | `/api/events/{id}/rsvp` | JWT | Update RSVP |
| DELETE | `/api/events/{id}/rsvp` | JWT | Cancel RSVP |
| GET | `/api/events/{id}/rsvps` | Owner | Attendee list |
| GET | `/api/events/{id}/counts` | JWT | Live counts snapshot |
| GET | `/api/rsvps/me` | JWT | My RSVPs |
| GET | `/api/events/{id}/analytics` | Owner | Analytics |
| POST | `/api/events/{id}/announcements` | Owner | Publish announcement |
| GET | `/api/events/{id}/announcements` | JWT | List announcements |
| GET | `/api/notifications` | JWT | My notifications |
| PUT | `/api/notifications/{id}/read` | JWT | Mark read |
| WS | `/ws/events/{id}` | — | Real-time counts |
| GET | `/api/health` | — | Health check |

Status codes: `200/201` success · `401` bad/expired token · `403` RBAC denial · `404` not found · `409` conflict (duplicate, deadline, cancelled) · `422` validation.

## RSVP System Rules

- **One active RSVP per (event_id, user_id)** — enforced by a database `UNIQUE` constraint
- GOING claims a seat; MAYBE/NOT_GOING release one; cancel removes the record
- Registration deadline and event status validated server-side
- Full capacity → response becomes `WAITLISTED` and event status → `FULL`

## Capacity Management & Concurrency

A naive `if going < capacity: insert` **races** when two users claim the last seat simultaneously. This project uses an **atomic conditional write**:

```sql
UPDATE events
   SET going_count = going_count + 1
 WHERE id = :id AND going_count < max_capacity
```

Row-level locking in SQLite/PostgreSQL guarantees only one writer wins; the loser receives `WAITLISTED`. The `test_concurrent_final_seat_requests` test fires 8 parallel GOING requests at a capacity-1 event and asserts **exactly one** succeeds.

## Waitlist

FIFO by join order. When a GOING attendee cancels, `_release_seat` runs, then the earliest waitlisted user is promoted and notified (`waitlist_promoted`).

## Folder Structure

```
Cloud-Event-RSVP-Tracker/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app + CORS + routers
│   │   ├── config.py            # env-driven settings
│   │   ├── database.py          # engine/session (SQLite↔Postgres swap)
│   │   ├── models.py            # User, Event, RSVP, Waitlist, Announcement, Notification, AuditLog
│   │   ├── schemas.py           # Pydantic request/response models
│   │   ├── security.py          # JWT + PBKDF2 + role deps
│   │   ├── realtime.py          # WebSocket connection manager
│   │   ├── routers/             # auth, events, notifications, ws
│   │   └── services/            # rsvp_service (atomic capacity), analytics_service
│   ├── tests/                   # 26 automated tests
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   └── src/
│       ├── pages/               # Login, Register, Discover, EventDetail, MyRsvps,
│       │                        # OrganizerDashboard, ManageEvent, CreateEvent
│       ├── components/          # Navbar, Notifications, CountsBar, Charts, Toast
│       ├── hooks/               # useAuth, useEventSocket (reconnect w/ backoff)
│       └── services/api.js      # REST client
├── sample_data/                 # events.json, invitees.csv (synthetic data)
├── docs/                        # architecture, API, deployment guides
├── screenshots/                 # proof checklist
├── .github/workflows/ci.yml     # CI: pytest + vite build
└── README.md
```

## Installation

```bash
# 1. Backend
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows  (source .venv/bin/activate on macOS/Linux)
pip install -r requirements.txt
copy .env.example .env          # set a strong SECRET_KEY
uvicorn app.main:app --reload --port 8000

# 2. Frontend (new terminal)
cd frontend
npm install
npm run dev                     # http://localhost:5173
```

Open **two browser windows** (or normal + incognito) to prove multi-user real-time updates.

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `SECRET_KEY` | dev value | JWT signing key — **must** override in production |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | 60 | Token lifetime |
| `DATABASE_URL` | `sqlite:///./rsvp_tracker.db` | Swap to `postgresql://…` for cloud |
| `CORS_ORIGINS` | `http://localhost:5173` | Allowed origins |

## Local Simulation (step-by-step)

```bash
# Terminal 1 — API
cd backend && uvicorn app.main:app --reload --port 8000

# Terminal 2 — UI
cd frontend && npm run dev
```

1. Register **organizer** `alice@example.com` → redirected to Organizer dashboard
2. Create event **"Cloud Computing Workshop"**, capacity **100**, status Published
3. Open the public event page — counts show `Going 0 / Maybe 0 / Not Going 0` with a **LIVE** dot
4. Second browser (incognito): register **attendee** `bob@example.com` → RSVP **GOING**
5. First browser immediately shows **Going = 1** with **no manual refresh**
6. Third window: attendee `carol` RSVPs **MAYBE**, then changes to **GOING** → counts `Going 2, Maybe 0` live
7. Organizer posts announcement "Venue Updated" → attendees see it in the Bell
8. Set capacity to 1 on a test event → second GOING becomes **WAITLISTED**, status **FULL**
9. Cancel the GOING RSVP → waitlisted user auto-promoted
10. Try editing someone else's event with another organizer account → **403**

## Testing

```bash
cd backend
python -m pytest -q
```

**26 automated tests** covering: registration, duplicate registration, login, bad login, token validation/expiry, organizer-only event creation, validation errors, RSVP create/update/cancel, duplicate RSVP upsert, deadline enforcement, capacity enforcement, **concurrent final-seat race (8 parallel clients)**, waitlist FIFO promotion, RBAC on attendee lists & analytics, unauthorized event modification, announcements → notifications, mark-read, event cancellation, analytics math, WebSocket broadcast.

## Cloud Deployment (Free Tier)

### Approach A — Student-friendly (recommended)

| Piece | Free-tier service |
|-------|-------------------|
| Frontend | Vercel / Netlify / Firebase Hosting (`npm run build` → publish `dist/`) |
| Backend | Render / Railway / PythonAnywhere / Cloud Run free tier |
| Database | Supabase Postgres free tier or Neon free tier → set `DATABASE_URL` |
| Real-time | Same backend WebSocket (or Firebase/Supabase realtime if fronting directly) |
| Auth (alt) | Firebase Auth / Supabase Auth if skipping custom JWT |

```bash
# example: deploy frontend to Vercel
npm i -g vercel
vercel --prod

# backend to Render: point root at backend/, build: pip install -r requirements.txt,
# start: uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Set env vars in the dashboard: `SECRET_KEY`, `DATABASE_URL`, `CORS_ORIGINS=https://your-frontend.vercel.app`.

### Approach B — Enterprise (AWS reference)

```
Users → CloudFront (CDN) → S3-hosted React
      → API Gateway → Lambda/Fargate (FastAPI) → RDS PostgreSQL / DynamoDB
      → API Gateway WebSocket API → live dashboards
Auth: Cognito · Notifications: SNS/SES · Monitoring: CloudWatch
```

Azure equivalent: Front Door → Static Web Apps → API Management → Functions → Cosmos/Postgres → Service Bus → Monitor.  
GCP equivalent: Cloud CDN → Firebase Hosting → Cloud Run → Firestore/Spanner → Pub/Sub → Cloud Monitoring.

## Security

- JWT with expiry; 401 on invalid/expired tokens
- PBKDF2-SHA256 (200k iterations, per-user salt) password hashing
- RBAC dependency: attendees blocked from organizer routes (403)
- Owner-scoped queries: cannot read another organizer's attendee list or analytics
- Unique DB constraint prevents duplicate RSVPs even if API is bypassed
- Frontend cannot mutate counts — `going_count` only changes inside backend transaction
- Input validation via Pydantic (dates, times, capacity bounds)
- CORS restricted to configured origins
- Secrets only via environment variables (never committed)
- Audit log rows for RSVP upserts/cancels

## Scalability

| Scale | Approach |
|-------|----------|
| ~100 users | Current single-node SQLite + in-memory WS hub |
| ~10k users | Postgres + N gunicorn/uvicorn workers behind a load balancer; sticky sessions or Redis pub/sub for WS fan-out |
| ~1M users / 100k RSVP in 5 min | Serverless autoscaling (Cloud Run/Lambda), API Gateway rate limiting, Redis cache for event docs, queue (Pub/Sub/SQS) for notifications/analytics, CDN for static assets, sharded/`going_count` hot-row mitigation via per-shard counters |

Hot-spot note: a single event row's `going_count` is a write hot spot at extreme scale — mitigate with counter shards (`counter_0..N`) summed on read, or Redis `INCR` + periodic flush.

## Failure Handling

| Failure | Handling in this project |
|---------|--------------------------|
| DB error mid-RSVP | `db.rollback()` — no partial writes |
| Duplicate request | Upsert semantics + UNIQUE constraint (idempotent) |
| WS disconnect | Client exponential backoff reconnect (max 10 tries) |
| Token expiry | 401 → redirect to login |
| Deadline passed / cancelled event | 409 with clear message |
| Double click RSVP | Same active record updated, not duplicated |

## Screenshots Checklist

Capture into `screenshots/` with names like `01-architecture.png`, `02-register.png`, … covering: folder structure, architecture diagram, register/login, organizer dashboard, create event, attendee RSVP, **live count update across two browsers**, FULL + waitlist, announcement + notification, analytics charts, concurrency test output, unauthorized 403, test suite run, GitHub repo + README.

## Results

- 26/26 automated tests passing
- Production frontend build succeeds (`vite build`)
- Live WebSocket count updates without page refresh
- Race-condition test proves exactly 1 winner for the final seat

## Limitations

- In-memory WebSocket hub is single-node (swap to Redis pub/sub for multi-instance)
- Email/SMS/push not wired (in-app notifications only)
- No payment/ticketing or QR check-in kiosk yet
- SQLite default — use PostgreSQL for concurrent cloud deployments

## Future Improvements

QR check-in, calendar (.ics) export, email/FCM reminders via scheduled functions, CSV export, seat/zone maps, recurring events, CI/CD blue-green deploys, Redis pub/sub scaling, AI attendance prediction.

## Learning Outcomes

Real-time systems, WebSocket design, database transactions & race conditions, RBAC, REST API design, cloud deployment, test-driven verification, and GitHub proof-of-work.

## Author

Student project — Cloud Computing course.

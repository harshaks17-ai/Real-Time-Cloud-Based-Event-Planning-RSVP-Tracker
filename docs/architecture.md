# Cloud Architecture — Real-Time RSVP Tracker

## High-level diagram

```
                     ┌─────────────────────────────────────────────┐
                     │                CLIENTS                     │
                     │  Browser A (Organizer)  Browser B (Attendee)│
                     └───────────┬─────────────────┬───────────────┘
                                 │ HTTPS           │ HTTPS
                                 ▼                 ▼
                     ┌─────────────────────────────────────────────┐
                     │          FRONTEND (React + Vite)           │
                     │   pages · hooks/useEventSocket · api.js    │
                     └───────────┬─────────────────┬───────────────┘
                                 │ REST /api/*     │ WS /ws/events/{id}
                                 ▼                 ▼
     ┌──────────────────────────────────────────────────────────────────┐
     │                     API GATEWAY / CORS                          │
     └──────────────────────────┬───────────────────────────────────────┘
                                ▼
     ┌──────────────────────────────────────────────────────────────────┐
     │              BACKEND (FastAPI — stateless)                      │
     │  routers: auth · events · notifications · ws                    │
     │  services: rsvp_service (atomic capacity) · analytics_service   │
     │  security: JWT auth · RBAC (organizer/attendee)                 │
     └────────────┬───────────────────────────────┬────────────────────┘
                  │ SQL (transactions)            │ broadcast
                  ▼                               ▼
   ┌──────────────────────────┐   ┌──────────────────────────────────┐
   │  DATABASE (SQLite/Postgres)│  │   REALTIME HUB (WebSocket)      │
   │  users · events · rsvps   │  │   rooms[event_id] → sockets     │
   │  waitlist · notifications │  │   (swap: Redis pub/sub)         │
   │  announcements · audit    │  └──────────────────────────────────┘
   └──────────────────────────┘
```

## RSVP write path (event-driven)

1. Client `POST /api/events/{id}/rsvp`
2. Auth middleware validates JWT, loads user
3. Service validates: event status, registration deadline
4. **Atomic conditional UPDATE** claims a seat (or waitlists)
5. UPSERT into `rsvps` (UNIQUE event_id+user_id)
6. Notification row created; audit log written
7. Transaction commits (or rolls back on error)
8. Counts recomputed → `manager.broadcast(event_id, counts)`
9. Every connected dashboard receives the new snapshot

## Capacity race condition

```
T0: capacity=1, going=0
T1: User A reads going=0  ─┐ both pass naive check
T2: User B reads going=0  ─┘
T3: A inserts GOING → going=1
T4: B inserts GOING → going=2  ✗ overbooked

THIS PROJECT:
T1: A runs UPDATE ... WHERE going_count < capacity → rowcount 1 ✓
T2: B runs UPDATE ... WHERE going_count < capacity → rowcount 0 ✗ → WAITLISTED
```

## Mapping to managed cloud services

| Local / this repo | Cloud equivalent |
|-------------------|------------------|
| FastAPI on uvicorn | Cloud Run / Fargate / Lambda + API Gateway |
| SQLite file | Cloud SQL (Postgres) / RDS / Supabase |
| In-memory WS hub | API Gateway WebSocket API / Redis pub/sub / Firebase Realtime DB |
| Custom JWT | Cognito / Firebase Auth / Auth0 |
| Vite static build | S3+CloudFront / Vercel / Firebase Hosting |
| In-app notifications | SNS + SES / Firebase Cloud Messaging |

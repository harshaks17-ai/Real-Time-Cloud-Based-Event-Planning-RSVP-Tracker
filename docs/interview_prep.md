# Interview Preparation — 10 Questions & Answers

### 1. Explain your project.
I built a Real-Time Cloud-Based Event Planning & RSVP Tracker. Organizers create events with capacity and deadlines; attendees RSVP as Going, Maybe, or Not Going. Everything is stored in a central cloud-style database, and the organizer dashboard updates live over WebSockets whenever anyone responds — no refresh needed. I implemented JWT authentication, role-based authorization, atomic capacity enforcement to prevent overbooking, a FIFO waitlist with automatic promotion, announcements, in-app notifications, and an analytics dashboard. The backend is FastAPI with SQLAlchemy, the frontend is React + Vite, and I wrote 26 automated tests including a concurrency test that fires parallel requests at the last seat.

### 2. What does "real-time" mean in your project?
Real-time means changes propagate to connected clients almost immediately. When an attendee submits an RSVP, the backend commits the write, recomputes counts, and broadcasts a JSON snapshot over a WebSocket room keyed by event ID. The organizer's dashboard listener updates the Going/Maybe/Not Going numbers instantly. This is push-based, unlike polling which would add latency and load.

### 3. Why did you use cloud computing for this project?
Cloud hosting gives a single source of truth accessible from any device or location, managed persistence, and easy scaling when an event suddenly gets a flood of RSVPs. I prioritized free-tier services — the same code deploys locally on SQLite, or to Render/Railway with Postgres by just changing the `DATABASE_URL` environment variable.

### 4. How did you prevent duplicate RSVPs?
Two layers: application logic upserts the existing RSVP instead of inserting a new one, and the database enforces a `UNIQUE(event_id, user_id)` constraint. Even if someone bypassed the API, the database rejects a second row. Updates like Maybe → Going modify the single record in place.

### 5. How did you handle event capacity?
Each event stores a denormalized `going_count`. When a user selects Going, the backend executes an atomic conditional update: `UPDATE events SET going_count = going_count + 1 WHERE id = ? AND going_count < max_capacity`. Only one writer can claim the final seat because the database locks the row during the update. If zero rows are affected, the user is waitlisted and the event flips to FULL.

### 6. What is a race condition, and how could it happen in your RSVP system?
A race condition is when concurrent operations produce a result that depends on timing. If capacity is 100 and going is 99, a naive read-check-insert lets Users A and both see one seat free and both insert — ending with 101. I avoid the read-then-write window entirely by making the check part of a single atomic UPDATE; the loser of the race gets WAITLISTED. My test suite proves exactly one of eight simultaneous requests wins the last seat.

### 7. What is the difference between REST APIs and WebSockets in your project?
REST APIs handle request-response operations: create event, submit RSVP, fetch analytics. They're stateless and cacheable. WebSockets maintain a persistent bidirectional connection so the server can push count updates to dashboards without being asked. REST for commands, WebSocket for continuous feed.

### 8. How would you scale to 100,000 users RSVPing in a few minutes?
Stateless API replicas behind a load balancer (or serverless Cloud Run/Lambda autoscaling), an API gateway for rate limiting, managed Postgres with connection pooling, Redis to fan out WebSocket messages across instances, queues (SQS/Pub-Sub) so notifications and analytics don't block the RSVP path, CDN for static assets, and counter sharding on hot event rows to avoid a single-row write bottleneck.

### 9. How did you test your project?
26 pytest tests cover auth (register, duplicate, login, expired tokens), event CRUD and RBAC, RSVP create/update/cancel, deadline enforcement, capacity limits, an 8-thread concurrency race for the final seat, waitlist FIFO promotion, announcement-driven notifications, analytics math, and a WebSocket test asserting the broadcast arrives after an RSVP. I also documented a multi-browser manual script for live demo proof.

### 10. How can this project be improved?
QR-based check-in, calendar (.ics) export, email and push reminders via scheduled cloud functions, payments/ticketing, seat maps, CI/CD blue-green deploys, Redis pub/sub for multi-node realtime, centralized observability, and an ML model to predict no-shows for smarter reminder targeting.

## Bonus quick hits

- **Auth vs authorization:** authentication proves identity (JWT); authorization checks permissions (role + ownership).  
- **Idempotency:** re-sending the same RSVP doesn't create duplicates — upsert + unique key.  
- **Why denormalize `going_count`?** O(1) capacity checks and cheap list queries; kept consistent inside the same transaction as RSVP writes.  
- **Free-tier DB choice:** Postgres on Neon/Supabase — wire-compatible with the SQLAlchemy URL I already use.  

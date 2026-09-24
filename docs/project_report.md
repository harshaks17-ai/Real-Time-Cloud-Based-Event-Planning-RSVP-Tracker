# Project Report — Real-Time Cloud-Based Event Planning & RSVP Tracker

## Abstract
A cloud-hosted event planning platform enabling organizers to create events, publish them to attendees, collect RSVPs (Going / Maybe / Not Going) in real time, enforce seating capacity race-condition-safely, manage FIFO waitlists, broadcast announcements, and monitor live analytics — implemented with React, FastAPI, SQL database, JWT authentication, and WebSockets.

## Introduction
Event coordination via spreadsheets and chat groups suffers from duplicate entries, stale counts, and overbooking. This project applies cloud computing patterns — centralized managed data, REST APIs, real-time push, role-based access — to deliver accurate, live RSVP tracking from any device.

## Problem Statement
1. No single source of truth for attendee responses  
2. Manual count updates lag behind reality  
3. Overbooking when the final seat is claimed concurrently  
4. Difficult multi-user coordination at scale  

## Objectives
- Build a multi-role web application (organizer / attendee)  
- Store data centrally in a cloud-style database  
- Push live count updates without page refresh  
- Enforce capacity with atomic transactions  
- Provide analytics, notifications, and announcements  
- Demonstrate security, testing, and deployment practices  

## Existing System
Paper RSVPs, Excel sheets, WhatsApp polls: duplicates, no capacity control, no live dashboard, no audit trail, privacy issues.

## Proposed System
Cloud REST API + realtime WebSocket channel; JWT + RBAC; atomic seat claims; waitlist promotion; in-app notifications; analytics dashboard; automated tests; free-tier deployable.

## Industry Relevance
Mirrors Eventbrite / Cvent / Splash / Hopin flows for conferences, festivals, webinars, corporate events, weddings, and meetups.

## Cloud Computing Concepts
See README table: SaaS/PaaS, cloud DB, realtime, serverless pattern, event-driven flow, RBAC, secrets via env, CI/CD, HA/autoscaling discussion.

## Real-Time Computing Concepts
Client-server push vs polling; WebSocket lifecycle; fan-out; reconnection with backoff; eventual consistency of dashboard snapshots.

## Technology Stack
React 18 + Vite · FastAPI + SQLAlchemy · SQLite/PostgreSQL · PyJWT · WebSockets · pytest · GitHub Actions.

## Architecture
Layered: Client → API → Services → DB, with a side WebSocket hub broadcasting post-commit count snapshots. Diagram: `docs/architecture.md`.

## Database Design
- **users** (PK id, unique email, role)  
- **events** (PK id, FK organizer_id → users, denormalized going_count, status enum)  
- **rsvps** (PK id, FK event_id, FK user_id, **UNIQUE(event_id,user_id)**, status)  
- **waitlist** (PK id, FK event_id, FK user_id, UNIQUE pair, position)  
- **announcements**, **notifications**, **audit_logs**  

Relationships: User 1—N Events; Event 1—N RSVPs; User 1—N RSVPs; Event 1—N Announcements/Waitlist.

## Authentication & Authorization
Register/login issue HS256 JWTs; passwords hashed with PBKDF2-SHA256 (200k iters). Dependencies `get_current_user` and `require_organizer` guard routes; ownership checks prevent cross-tenant access.

## Event Management
CRUD + publish + cancel with validation (date order, time order, deadline ≤ event date, capacity ≥ current going).

## RSVP Workflow
Validate event open → atomic seat claim if GOING → upsert RSVP (unique constraint) → notify → audit → commit → broadcast counts.

## Real-Time Updates
`ConnectionManager` rooms per event; every RSVP mutation recomputes counts and broadcasts JSON snapshots; clients keep a resilient socket open.

## Capacity Management
`UPDATE events SET going_count = going_count + 1 WHERE going_count < max_capacity` — rowcount 0 ⇒ waitlist; status flips to FULL at limit.

## Concurrency Control
Race scenario (capacity 100, going 99, two simultaneous GOING) solved by conditional atomic update under DB row lock; verified by 8-thread pytest.

## Waitlist
Ordered FIFO entries; on cancel of a GOING seat, first waiter promoted + notified.

## Notifications
Rows created for RSVP confirmation, announcements, cancellations, waitlist promotion; polled + bell UI with mark-read.

## Analytics
Going/Maybe/NotGoing/Waitlisted, response rate, capacity utilization, available seats, growth-over-time series rendered as donut + line + capacity bar.

## API Design
Full table in README; OpenAPI docs auto-generated at `/docs`.

## Implementation
Modular packages: routers (HTTP), services (domain logic), security, realtime, schemas. Frontend split into pages/components/hooks/services.

## Testing
26 automated tests (auth, CRUD, RSVP, deadline, capacity, concurrency race, waitlist, RBAC, notifications, analytics, WebSocket) + manual multi-browser script (`docs/simulation.md`).

## Cloud Deployment
Student path: Vercel/Netlify (frontend) + Render/Railway (backend) + Neon/Supabase Postgres; enterprise path: CloudFront → API Gateway → Lambda/Fargate → RDS with Cognito/SNS/CloudWatch (Azure/GCP equivalents documented).

## Security
JWT expiry, password hashing, RBAC, owner scoping, UNIQUE constraints, Pydantic validation, CORS allow-list, env-only secrets, audit logs, server-authoritative counts.

## Scalability
Horizontal stateless replicas; Redis pub/sub for multi-node WS; caching; queues for fan-out; rate limiting; counter sharding for hot events.

## Failure Handling
Transactions + rollback, idempotent upsert, WS backoff reconnect, graceful 409/403/401 errors, busy_timeout on SQLite.

## Results
All tests green; production build succeeds; live cross-window count updates demonstrated; exactly-one-winner concurrency proof.

## Advantages
Free-tier friendly, real-time, race-safe, modular, well-tested, GitHub-ready, beginner-accessible.

## Limitations
Single-node realtime hub; no email/SMS; no payments/QR check-in; SQLite default.

## Future Scope
QR check-in kiosk, calendar export, scheduled reminders, CI/CD blue-green, Redis scaling, AI no-show prediction.

## Conclusion
The project successfully demonstrates core cloud computing and real-time systems concepts through a production-style, tested, deployable application that solves a real coordination problem.

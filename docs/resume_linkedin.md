# Resume & LinkedIn Proof

## A. Resume bullet points

1. Designed and built a **real-time cloud RSVP platform** (React, FastAPI, WebSockets, SQL) with JWT auth, RBAC, and live organizer dashboards that update without page refresh.  
2. Implemented **race-condition-safe capacity control** using atomic conditional UPDATE transactions and FIFO waitlist promotion; verified with an 8-thread concurrency test (26/26 pytest suite green).  
3. Delivered analytics, announcements, and in-app notifications with **free-tier cloud deployment** (Vercel/Render/Neon) and GitHub Actions CI running tests + production builds on every push.

## B. 2-line project description

**Real-Time Cloud Event Planning & RSVP Tracker** — Cloud-native event platform with live WebSocket RSVP counts, atomic capacity enforcement, waitlists, and analytics.  
*Stack: React · FastAPI · SQLAlchemy/PostgreSQL · JWT · WebSockets · pytest · GitHub Actions.*

## C. LinkedIn project description

Built a Real-Time Cloud-Based Event Planning & RSVP Tracker as a cloud computing course project. Organizers create events and watch Going/Maybe/Not Going counts update live over WebSockets while attendees RSVP from any device. Key engineering: JWT authentication with role-based access, a UNIQUE(event_id, user_id) constraint plus atomic conditional writes to stop overbooking during concurrent RSVP storms, FIFO waitlist auto-promotion, announcements with fan-out notifications, and an analytics dashboard (response rate, capacity utilization, growth over time). The FastAPI + React codebase ships with 26 automated tests — including a parallel race test proving exactly one user claims the final seat — GitHub Actions CI, environment-based secrets management, and free-tier deployment instructions (Vercel + Render + Neon Postgres).

## D. Technical skills demonstrated

Cloud computing (SaaS/PaaS, managed DB, serverless patterns) · Real-time systems (WebSockets, push vs polling) · REST API design · SQL modeling (keys, unique constraints, indexes) · Transactions & concurrency control · JWT auth & RBAC · Python/FastAPI/SQLAlchemy · React/Vite · Testing (pytest, race tests) · CI/CD · Security best practices · Scalability design (caching, queues, sharding).

## E. GitHub repository description

> Real-time cloud-based event planning and RSVP platform featuring event management, live RSVP tracking, cloud authentication, capacity control, notifications, analytics, and scalable cloud architecture.

**Topics:** `cloud-computing` `event-management` `rsvp` `realtime` `python` `fastapi` `react` `websocket` `cloud-database` `rest-api` `authentication`

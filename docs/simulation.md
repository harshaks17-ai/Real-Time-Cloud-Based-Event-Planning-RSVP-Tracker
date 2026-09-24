# Local Simulation Script

Run this end-to-end flow to prove real-time behavior for your demo/report.

## Prerequisites

```bash
# Terminal 1 — backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Terminal 2 — frontend
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## STEP 1–4 — Organizer setup

1. Register: name `Alice`, email `alice@example.com`, role **Organizer**
2. Click **+ Create event**
3. Name: `Cloud Computing Workshop`, capacity: `100`, status: **Published**
4. Save → Manage page shows live counts: Going 0 · Maybe 0 · Not Going 0 with green **LIVE** dot

## STEP 5–7 — Two attendees (use incognito windows)

5. Window 2: register `bob@example.com` (Attendee) → open event → **Going**
   - Organizer window: **Going = 1** (no refresh)
6. Window 3: register `carol@example.com` → RSVP **Maybe**
   - Organizer window: **Maybe = 1**
7. Carol switches **Maybe → Going**
   - Organizer window: **Going = 2, Maybe = 0** instantly

## STEP 8–10 — Announcement

8. Organizer: Post announcement `Venue Updated` / `Session moved to Hall B`
9. Attendees: click Bell → notification appears
10. Bell unread count increments in both attendee windows

## STEP 11 — Cancellation

11. Bob → Cancel RSVP → organizer count drops; if a waitlisted user exists they auto-promote

## STEP 12 — Capacity limit

12. Create a second event with capacity `1`
    - User A: GOING → accepted
    - User B: GOING → **WAITLISTED**, event status **FULL**
    - Cancel A → B promoted to GOING + notified

## STEP 13 — Unauthorized modification

13. Register another organizer `eve@example.com`
14. While logged in as Eve, from the first organizer's Manage page try Delete
    - (Or call API directly) → **403 Forbidden**
    - Eve's `GET /api/events/{alice-event}/analytics` → **403**

## Optional: API-only demo with curl/PowerShell

```powershell
$base = "http://127.0.0.1:8000"
$org = Invoke-RestMethod -Method Post "$base/api/register" -ContentType "application/json" `
  -Body '{"email":"demo-org@x.com","password":"secret123","name":"Demo Org","role":"organizer"}'
$oh = @{ Authorization = "Bearer $($org.access_token)" }
$ev = Invoke-RestMethod -Method Post "$base/api/events" -Headers $oh -ContentType "application/json" `
  -Body '{"name":"Demo","event_date":"2099-12-01","registration_deadline":"2099-11-30","max_capacity":2,"status":"PUBLISHED"}'
# ... register attendees and POST /api/events/$($ev.id)/rsvp
```

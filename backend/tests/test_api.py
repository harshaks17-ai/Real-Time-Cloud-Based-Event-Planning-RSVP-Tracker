from concurrent.futures import ThreadPoolExecutor

from tests.conftest import register, auth_header, make_event


def test_health(client):
    assert client.get("/api/health").json()["status"] == "ok"


def test_register_and_login(client):
    u = register(client, "a@x.com", name="Alice")
    assert u["user"]["email"] == "a@x.com"
    r = client.post("/api/login", json={"email": "a@x.com", "password": "secret123"})
    assert r.status_code == 200
    assert r.json()["access_token"]


def test_duplicate_registration(client):
    register(client, "dup@x.com")
    r = client.post("/api/register", json={"email": "dup@x.com", "password": "secret123", "name": "D", "role": "attendee"})
    assert r.status_code == 409


def test_bad_login(client):
    register(client, "b@x.com")
    r = client.post("/api/login", json={"email": "b@x.com", "password": "wrongpass"})
    assert r.status_code == 401


def test_me_requires_token(client):
    assert client.get("/api/me").status_code == 401


def test_organizer_creates_event(client):
    org = register(client, "org@x.com", role="organizer")
    ev = make_event(client, org["access_token"])
    assert ev["status"] == "PUBLISHED"
    assert ev["max_capacity"] == 100


def test_attendee_cannot_create_event(client):
    att = register(client, "att@x.com", role="attendee")
    r = client.post("/api/events", json={
        "name": "X", "event_date": "2099-01-01", "registration_deadline": "2098-12-31"
    }, headers=auth_header(att["access_token"]))
    assert r.status_code == 403


def test_event_validation(client):
    org = register(client, "org2@x.com", role="organizer")
    r = client.post("/api/events", json={
        "name": "Bad", "event_date": "2099-01-01", "registration_deadline": "2099-02-01"
    }, headers=auth_header(org["access_token"]))
    assert r.status_code == 422


def test_get_event(client):
    org = register(client, "org3@x.com", role="organizer")
    ev = make_event(client, org["access_token"])
    r = client.get(f"/api/events/{ev['id']}", headers=auth_header(org["access_token"]))
    assert r.status_code == 200
    assert r.json()["name"] == ev["name"]


def test_valid_rsvp_going(client):
    org = register(client, "o@x.com", role="organizer")
    att = register(client, "g1@x.com")
    ev = make_event(client, org["access_token"])
    r = client.post(f"/api/events/{ev['id']}/rsvp", json={"status": "GOING"},
                    headers=auth_header(att["access_token"]))
    assert r.status_code == 201
    assert r.json()["status"] == "GOING"
    counts = client.get(f"/api/events/{ev['id']}/counts", headers=auth_header(org["access_token"])).json()
    assert counts["going"] == 1


def test_duplicate_rsvp_upsert_single_record(client):
    org = register(client, "o2@x.com", role="organizer")
    att = register(client, "g2@x.com")
    ev = make_event(client, org["access_token"])
    h = auth_header(att["access_token"])
    client.post(f"/api/events/{ev['id']}/rsvp", json={"status": "GOING"}, headers=h)
    client.post(f"/api/events/{ev['id']}/rsvp", json={"status": "GOING"}, headers=h)
    rsvps = client.get("/api/rsvps/me", headers=h).json()
    assert len([r for r in rsvps if r["event_id"] == ev["id"]]) == 1


def test_update_going_to_maybe(client):
    org = register(client, "o3@x.com", role="organizer")
    att = register(client, "g3@x.com")
    ev = make_event(client, org["access_token"])
    h = auth_header(att["access_token"])
    client.post(f"/api/events/{ev['id']}/rsvp", json={"status": "GOING"}, headers=h)
    r = client.put(f"/api/events/{ev['id']}/rsvp", json={"status": "MAYBE"}, headers=h)
    assert r.json()["status"] == "MAYBE"
    counts = client.get(f"/api/events/{ev['id']}/counts", headers=auth_header(org["access_token"])).json()
    assert counts["going"] == 0 and counts["maybe"] == 1


def test_update_maybe_to_going(client):
    org = register(client, "o4@x.com", role="organizer")
    att = register(client, "g4@x.com")
    ev = make_event(client, org["access_token"])
    h = auth_header(att["access_token"])
    client.post(f"/api/events/{ev['id']}/rsvp", json={"status": "MAYBE"}, headers=h)
    client.put(f"/api/events/{ev['id']}/rsvp", json={"status": "GOING"}, headers=h)
    counts = client.get(f"/api/events/{ev['id']}/counts", headers=auth_header(org["access_token"])).json()
    assert counts["going"] == 1 and counts["maybe"] == 0


def test_cancel_rsvp(client):
    org = register(client, "o5@x.com", role="organizer")
    att = register(client, "g5@x.com")
    ev = make_event(client, org["access_token"])
    h = auth_header(att["access_token"])
    client.post(f"/api/events/{ev['id']}/rsvp", json={"status": "GOING"}, headers=h)
    r = client.delete(f"/api/events/{ev['id']}/rsvp", headers=h)
    assert r.status_code == 200
    counts = client.get(f"/api/events/{ev['id']}/counts", headers=auth_header(org["access_token"])).json()
    assert counts["going"] == 0


def test_registration_deadline_enforced(client, monkeypatch):
    org = register(client, "o6@x.com", role="organizer")
    att = register(client, "g6@x.com")
    ev = make_event(client, org["access_token"], registration_deadline="2000-01-01")
    r = client.post(f"/api/events/{ev['id']}/rsvp", json={"status": "GOING"},
                    headers=auth_header(att["access_token"]))
    assert r.status_code == 409


def test_capacity_enforcement_rejects_or_waitlists(client):
    org = register(client, "o7@x.com", role="organizer")
    ev = make_event(client, org["access_token"], max_capacity=1)
    a = register(client, "seat1@x.com")
    b = register(client, "seat2@x.com")
    r1 = client.post(f"/api/events/{ev['id']}/rsvp", json={"status": "GOING"},
                     headers=auth_header(a["access_token"]))
    r2 = client.post(f"/api/events/{ev['id']}/rsvp", json={"status": "GOING"},
                     headers=auth_header(b["access_token"]))
    assert r1.json()["status"] == "GOING"
    assert r2.json()["status"] == "WAITLISTED"
    counts = client.get(f"/api/events/{ev['id']}/counts", headers=auth_header(org["access_token"])).json()
    assert counts["going"] == 1 and counts["waitlisted"] == 1
    detail = client.get(f"/api/events/{ev['id']}", headers=auth_header(org["access_token"])).json()
    assert detail["status"] == "FULL"


def test_concurrent_final_seat_requests(client):
    """Race-condition test: capacity=1, 8 users request GOING simultaneously."""
    org = register(client, "o8@x.com", role="organizer")
    ev = make_event(client, org["access_token"], max_capacity=1)
    tokens = [register(client, f"race{i}@x.com")["access_token"] for i in range(8)]

    def hit(tok):
        return client.post(f"/api/events/{ev['id']}/rsvp", json={"status": "GOING"},
                           headers=auth_header(tok)).json()["status"]

    with ThreadPoolExecutor(max_workers=8) as pool:
        results = list(pool.map(hit, tokens))

    going = results.count("GOING")
    waitlisted = results.count("WAITLISTED")
    assert going == 1, f"expected exactly 1 GOING, got {going} ({results})"
    assert going + waitlisted == 8
    counts = client.get(f"/api/events/{ev['id']}/counts", headers=auth_header(org["access_token"])).json()
    assert counts["going"] == 1


def test_waitlist_promotion_fifo(client):
    org = register(client, "o9@x.com", role="organizer")
    ev = make_event(client, org["access_token"], max_capacity=1)
    a = register(client, "w1@x.com")
    b = register(client, "w2@x.com")
    ha, hb = auth_header(a["access_token"]), auth_header(b["access_token"])
    client.post(f"/api/events/{ev['id']}/rsvp", json={"status": "GOING"}, headers=ha)
    client.post(f"/api/events/{ev['id']}/rsvp", json={"status": "GOING"}, headers=hb)  # waitlisted
    client.delete(f"/api/events/{ev['id']}/rsvp", headers=ha)  # frees seat -> B promoted
    rb = client.get("/api/rsvps/me", headers=hb).json()
    assert any(r["event_id"] == ev["id"] and r["status"] == "GOING" for r in rb)


def test_only_owner_views_rsvps_and_analytics(client):
    org = register(client, "o10@x.com", role="organizer")
    other = register(client, "o10b@x.com", role="organizer")
    att = register(client, "g10@x.com")
    ev = make_event(client, org["access_token"])
    client.post(f"/api/events/{ev['id']}/rsvp", json={"status": "GOING"},
                headers=auth_header(att["access_token"]))
    assert client.get(f"/api/events/{ev['id']}/rsvps",
                      headers=auth_header(org["access_token"])).status_code == 200
    assert client.get(f"/api/events/{ev['id']}/rsvps",
                      headers=auth_header(other["access_token"])).status_code == 403
    assert client.get(f"/api/events/{ev['id']}/analytics",
                      headers=auth_header(other["access_token"])).status_code == 403


def test_unauthorized_event_modification(client):
    org = register(client, "o11@x.com", role="organizer")
    evil = register(client, "evil@x.com", role="organizer")
    ev = make_event(client, org["access_token"])
    r = client.put(f"/api/events/{ev['id']}", json={
        "name": "Hacked", "event_date": "2099-12-01", "registration_deadline": "2099-11-30"
    }, headers=auth_header(evil["access_token"]))
    assert r.status_code == 403
    r2 = client.delete(f"/api/events/{ev['id']}", headers=auth_header(evil["access_token"]))
    assert r2.status_code == 403


def test_announcement_creates_notifications(client):
    org = register(client, "o12@x.com", role="organizer")
    att = register(client, "g12@x.com")
    ev = make_event(client, org["access_token"])
    client.post(f"/api/events/{ev['id']}/rsvp", json={"status": "GOING"},
                headers=auth_header(att["access_token"]))
    r = client.post(f"/api/events/{ev['id']}/announcements",
                    json={"title": "Venue Updated", "message": "Now in Hall B"},
                    headers=auth_header(org["access_token"]))
    assert r.status_code == 201
    notes = client.get("/api/notifications", headers=auth_header(att["access_token"])).json()
    assert any("Venue Updated" in n["message"] for n in notes)


def test_notification_mark_read(client):
    org = register(client, "o13@x.com", role="organizer")
    att = register(client, "g13@x.com")
    ev = make_event(client, org["access_token"])
    client.post(f"/api/events/{ev['id']}/rsvp", json={"status": "GOING"},
                headers=auth_header(att["access_token"]))
    notes = client.get("/api/notifications", headers=auth_header(att["access_token"])).json()
    assert notes
    r = client.put(f"/api/notifications/{notes[0]['id']}/read",
                   headers=auth_header(att["access_token"]))
    assert r.json()["is_read"] is True


def test_cancel_event_notifies_and_blocks_rsvp(client):
    org = register(client, "o14@x.com", role="organizer")
    att = register(client, "g14@x.com")
    ev = make_event(client, org["access_token"])
    client.post(f"/api/events/{ev['id']}/rsvp", json={"status": "GOING"},
                headers=auth_header(att["access_token"]))
    r = client.post(f"/api/events/{ev['id']}/cancel", headers=auth_header(org["access_token"]))
    assert r.json()["status"] == "CANCELLED"
    r2 = client.post(f"/api/events/{ev['id']}/rsvp", json={"status": "GOING"},
                     headers=auth_header(att["access_token"]))
    assert r2.status_code == 409
    notes = client.get("/api/notifications", headers=auth_header(att["access_token"])).json()
    assert any(n["type"] == "event_cancelled" for n in notes)


def test_analytics_calculation(client):
    org = register(client, "o15@x.com", role="organizer")
    ev = make_event(client, org["access_token"], max_capacity=10)
    users = [register(client, f"an{i}@x.com") for i in range(4)]
    statuses = ["GOING", "GOING", "MAYBE", "NOT_GOING"]
    for u, s in zip(users, statuses):
        client.post(f"/api/events/{ev['id']}/rsvp", json={"status": s},
                    headers=auth_header(u["access_token"]))
    data = client.get(f"/api/events/{ev['id']}/analytics",
                      headers=auth_header(org["access_token"])).json()
    assert data["going"] == 2
    assert data["maybe"] == 1
    assert data["not_going"] == 1
    assert data["capacity_utilization"] == 20.0
    assert data["available_seats"] == 8
    assert len(data["growth"]) == 4


def test_expired_or_invalid_token_rejected(client):
    r = client.get("/api/me", headers={"Authorization": "Bearer not-a-real-token"})
    assert r.status_code == 401


def test_realtime_websocket_broadcast(client):
    from app.realtime import manager
    org = register(client, "o16@x.com", role="organizer")
    ev = make_event(client, org["access_token"])
    with client.websocket_connect(f"/ws/events/{ev['id']}") as ws:
        first = ws.receive_json()
        assert first["type"] == "counts"
        att = register(client, "ws1@x.com")
        client.post(f"/api/events/{ev['id']}/rsvp", json={"status": "GOING"},
                    headers=auth_header(att["access_token"]))
        update = ws.receive_json()
        assert update["going"] == 1

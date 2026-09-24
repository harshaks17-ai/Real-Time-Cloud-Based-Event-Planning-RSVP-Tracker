import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../services/api";
import { useAuth } from "../hooks/useAuth";
import { useEventSocket } from "../hooks/useEventSocket";
import { usePoll } from "../hooks/usePoll";
import { CountsBar } from "../components/CountsBar";
import { fireBurstFrom } from "../components/effects";
import Toast from "../components/Toast";

export default function EventDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [event, setEvent] = useState(null);
  const [myStatus, setMyStatus] = useState(null);
  const [anns, setAnns] = useState([]);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [busyKey, setBusyKey] = useState(null);
  const { counts, setCounts, connected } = useEventSocket(id);
  const actionsRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const [ev, my, a, c] = await Promise.all([
        api.getEvent(id),
        api.myRsvps(),
        api.announcements(id),
        api.counts(id),
      ]);
      setEvent(ev);
      setAnns(a);
      setCounts(c);
      const mine = my.find((r) => r.event_id === id);
      setMyStatus(mine ? mine.status : null);
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }, [id, setCounts]);

  useEffect(() => { load(); }, [load]);
  // WS for instant pushes; poll as fallback + keeps announcements fresh
  usePoll(load, 4000);

  const respond = async (status, e) => {
    setError("");
    setBusyKey(status);
    try {
      const r = myStatus ? await api.updateRsvp(id, status) : await api.rsvp(id, status);
      setMyStatus(r.status);
      const c = await api.counts(id);
      setCounts(c);
      if (r.status === "GOING") {
        fireBurstFrom(actionsRef.current, e);
        setToast("Your RSVP has been recorded — see the live counter!");
      } else {
        setToast(`RSVP recorded: ${r.status.replace("_", " ")}`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyKey(null);
    }
  };

  const cancel = async () => {
    try {
      await api.cancelRsvp(id);
      setMyStatus(null);
      setCounts(await api.counts(id));
      setToast("RSVP cancelled");
    } catch (e) {
      setError(e.message);
    }
  };

  if (!event)
    return (
      <div className="container">
        <div className="skeleton" style={{ width: "50%", height: 36 }} />
        <div className="skeleton" style={{ width: "80%" }} />
        <div className="skeleton" style={{ width: "65%" }} />
      </div>
    );

  const isOwner = user?.id === event.organizer_id;

  return (
    <div className="container">
      <Toast message={toast} onDone={() => setToast("")} />

      <div className="section-head">
        <div>
          <div className="hero-kicker" style={{ marginBottom: 10 }}>
            {event.event_type} · {event.event_date}
          </div>
          <h2 className="page-title">{event.name}</h2>
          <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center" }}>
            <span className={`badge ${event.status}`}>{event.status}</span>
            <span className="live-label">
              <span className={`live-dot ${connected ? "" : "off"}`} />
              {connected ? "Realtime connected" : "Reconnecting…"}
            </span>
          </div>
        </div>
        {isOwner && (
          <Link className="btn ghost" to={`/organizer/events/${event.id}`}>
            ⚙ Manage event
          </Link>
        )}
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="event-meta" style={{ marginBottom: 12 }}>
          <span>📅 {event.event_date}</span>
          <span>⏰ {event.start_time} – {event.end_time}</span>
          <span>📍 {event.venue || event.online_link || "TBA"}</span>
          <span>👥 {event.max_capacity} capacity</span>
          <span>⏳ Deadline {event.registration_deadline}</span>
        </div>
        <p style={{ lineHeight: 1.7, color: "var(--muted)" }}>{event.description || "No description."}</p>
        <p className="muted" style={{ marginTop: 8 }}>Hosted by <strong style={{ color: "#fff" }}>{event.organizer_name}</strong></p>
      </div>

      <h3 style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
        Live counts
        <span className={`live-dot ${connected ? "" : "off"}`} />
      </h3>
      <CountsBar counts={counts} connected={connected} />

      {user && (
        <div className="card" style={{ marginTop: 18 }} ref={actionsRef}>
          <h3>Your RSVP</h3>
          {myStatus ? (
            <>
              <p style={{ marginBottom: 14 }}>
                Current status:{" "}
                <span className={`badge ${myStatus}`}>{myStatus.replace("_", " ")}</span>
              </p>
              <div className="btn-row">
                <button
                  className={`btn going lg ${myStatus === "GOING" ? "active" : ""}`}
                  disabled={busyKey !== null}
                  onClick={(e) => respond("GOING", e)}
                >
                  {busyKey === "GOING" ? "Saving…" : "🎉 Going"}
                </button>
                <button
                  className={`btn maybe lg ${myStatus === "MAYBE" ? "active" : ""}`}
                  disabled={busyKey !== null}
                  onClick={(e) => respond("MAYBE", e)}
                >
                  {busyKey === "MAYBE" ? "Saving…" : "🤔 Maybe"}
                </button>
                <button
                  className={`btn no lg ${myStatus === "NOT_GOING" ? "active" : ""}`}
                  disabled={busyKey !== null}
                  onClick={(e) => respond("NOT_GOING", e)}
                >
                  {busyKey === "NOT_GOING" ? "Saving…" : "❌ Not Going"}
                </button>
                <button className="btn ghost lg" onClick={cancel}>Cancel RSVP</button>
              </div>
            </>
          ) : (
            <div className="btn-row">
              <button className="btn going lg" disabled={busyKey !== null} onClick={(e) => respond("GOING", e)}>
                {busyKey === "GOING" ? "Saving…" : "🎉 Going"}
              </button>
              <button className="btn maybe lg" disabled={busyKey !== null} onClick={(e) => respond("MAYBE", e)}>
                {busyKey === "MAYBE" ? "Saving…" : "🤔 Maybe"}
              </button>
              <button className="btn no lg" disabled={busyKey !== null} onClick={(e) => respond("NOT_GOING", e)}>
                {busyKey === "NOT_GOING" ? "Saving…" : "❌ Not Going"}
              </button>
            </div>
          )}
          {error && <div className="error">{error}</div>}
          {myStatus === "WAITLISTED" && (
            <p className="muted" style={{ marginTop: 12 }}>
              ⏳ Event is full — you're on the waitlist. We'll auto-promote you the moment a seat opens.
            </p>
          )}
        </div>
      )}

      <div className="card" style={{ marginTop: 18 }}>
        <h3>📣 Announcements</h3>
        {anns.length === 0 && (
          <div className="empty" style={{ padding: 20 }}>
            <div className="icon">📭</div>
            No announcements yet.
          </div>
        )}
        {anns.map((a, i) => (
          <div className="ann-item" key={a.id} style={{ animationDelay: `${i * 0.06}s` }}>
            <strong>{a.title}</strong>
            <div className="muted">{a.message}</div>
            <div className="muted" style={{ fontSize: 11, marginTop: 3 }}>
              {new Date(a.created_at).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

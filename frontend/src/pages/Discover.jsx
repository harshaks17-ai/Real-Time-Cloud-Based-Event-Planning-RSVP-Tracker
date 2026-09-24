import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import { useAuth } from "../hooks/useAuth";

export default function Discover() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    api.listEvents().then(setEvents).catch((e) => setError(e.message));
  }, [user]);

  if (!user) {
    return (
      <div className="container">
        <div className="card">
          <h2>Real-Time Cloud Event Planning & RSVP Tracker</h2>
          <p className="muted">
            Create events, collect RSVPs in real time, enforce capacity, and check in attendees.
            Cloud auth · live dashboard · notifications · analytics.
          </p>
          <Link className="btn" to="/login">Login to continue</Link>
        </div>
      </div>
    );
  }

  const q = filter.toLowerCase();
  const shown = events.filter(
    (e) => e.name.toLowerCase().includes(q) || e.venue.toLowerCase().includes(q) || e.event_type.includes(q)
  );

  return (
    <div className="container">
      <div style={{ display: "flex", gap: 12, marginBottom: 18, alignItems: "center" }}>
        <h2 style={{ margin: 0, flex: 1 }}>Discover events</h2>
        <input
          placeholder="Search name / venue / type…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ margin: 0, maxWidth: 280 }}
        />
      </div>
      {error && <div className="error">{error}</div>}
      <div className="grid cols-2">
        {shown.map((ev) => (
          <div className="card" key={ev.id}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <h2 style={{ margin: "0 0 6px", fontSize: 18 }}>{ev.name}</h2>
              <span className={`badge ${ev.status}`}>{ev.status}</span>
            </div>
            <div className="muted">
              {ev.event_date} · {ev.start_time}–{ev.end_time} · {ev.event_type}
            </div>
            <div className="muted">{ev.venue || ev.online_link || "TBA"}</div>
            <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="muted">
                {ev.going_count}/{ev.max_capacity} going
              </span>
              <Link className="btn sm" to={`/events/${ev.id}`}>View & RSVP</Link>
            </div>
          </div>
        ))}
        {shown.length === 0 && <div className="muted">No events found.</div>}
      </div>
    </div>
  );
}

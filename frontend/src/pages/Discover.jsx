import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import { useAuth } from "../hooks/useAuth";
import { usePoll } from "../hooks/usePoll";
import { AnimatedNumber } from "../components/AnimatedNumber";

function LandingHero() {
  return (
    <div className="hero">
      <div>
        <div className="hero-kicker">● Real-time · Cloud · Free-tier</div>
        <h1>
          Event RSVPs that update{" "}
          <span className="grad-text">live</span> — like magic.
        </h1>
        <p className="lead">
          Organizers create events, attendees RSVP from any device, and dashboards
          update over WebSockets the instant someone responds. Capacity is enforced
          race-condition-safe so you never overbook the last seat.
        </p>
        <div className="hero-actions">
          <Link className="btn lg" to="/register">Get started free →</Link>
          <Link className="btn lg ghost" to="/login">I have an account</Link>
        </div>
        <div className="hero-stats">
          <div className="hero-stat">
            <b className="stat-going">26/26</b>
            <span>Tests passing</span>
          </div>
          <div className="hero-stat">
            <b className="stat-wait">WebSocket</b>
            <span>Live updates</span>
          </div>
          <div className="hero-stat">
            <b className="stat-maybe">Atomic</b>
            <span>Capacity locks</span>
          </div>
          <div className="hero-stat">
            <b className="stat-no">JWT + RBAC</b>
            <span>Security</span>
          </div>
        </div>
      </div>

      <div className="hero-visual">
        <div className="float-card">
          <div className="live-label" style={{ marginBottom: 12 }}>
            <span className="live-dot" /> Live dashboard
          </div>
          <div className="grid cols-3" style={{ gap: 10 }}>
            <div>
              <div className="muted" style={{ fontSize: 11 }}>GOING</div>
              <div style={{ fontSize: 30, fontWeight: 800 }} className="stat-going">49</div>
            </div>
            <div>
              <div className="muted" style={{ fontSize: 11 }}>MAYBE</div>
              <div style={{ fontSize: 30, fontWeight: 800 }} className="stat-maybe">12</div>
            </div>
            <div>
              <div className="muted" style={{ fontSize: 11 }}>SEATS</div>
              <div style={{ fontSize: 30, fontWeight: 800 }} className="stat-wait">51</div>
            </div>
          </div>
          <div className="progress" style={{ marginTop: 14 }}>
            <div style={{ width: "49%" }} />
          </div>
          <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>
            Cloud Computing Workshop · capacity 100
          </div>
        </div>
        <div className="float-card delay">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div className="muted" style={{ fontSize: 11 }}>NEW RSVP</div>
              <strong>Bob → Going</strong>
            </div>
            <span className="badge GOING">Going</span>
          </div>
          <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>
            Dashboard updated in <strong style={{ color: "#3dffb0" }}>~50ms</strong> via WebSocket
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Discover() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = () => {
    if (!user) { setLoading(false); return Promise.resolve(); }
    return api
      .listEvents()
      .then((list) => { setEvents(list); setError(""); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  usePoll(load, 3000, !!user);

  if (!user) return <LandingHero />;

  const q = filter.toLowerCase();
  const shown = events.filter(
    (e) =>
      e.name.toLowerCase().includes(q) ||
      (e.venue || "").toLowerCase().includes(q) ||
      (e.event_type || "").toLowerCase().includes(q)
  );

  return (
    <div className="container">
      <div className="section-head">
        <div>
          <div className="hero-kicker" style={{ marginBottom: 8 }}>Browse</div>
          <h2 className="page-title">Discover events</h2>
        </div>
        <input
          className="search-input"
          placeholder="Search name / venue / type…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      {error && <div className="error">{error}</div>}

      {loading ? (
        <div className="grid cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div className="card" key={i}>
              <div className="skeleton" style={{ width: "70%", height: 24 }} />
              <div className="skeleton" style={{ width: "50%" }} />
              <div className="skeleton" style={{ width: "40%" }} />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid cols-2">
          {shown.map((ev) => {
            const pct = ev.max_capacity ? Math.min(100, (ev.going_count / ev.max_capacity) * 100) : 0;
            return (
              <div className="card event-card" key={ev.id}>
                <div className="event-top">
                  <h2>{ev.name}</h2>
                  <span className={`badge ${ev.status}`}>{ev.status}</span>
                </div>
                <div className="event-meta">
                  <span>📅 {ev.event_date}</span>
                  <span>⏰ {ev.start_time}–{ev.end_time}</span>
                  <span>🏷️ {ev.event_type}</span>
                </div>
                <div className="muted">📍 {ev.venue || ev.online_link || "TBA"}</div>
                <div className="mini-bar">
                  <div style={{ width: `${pct}%` }} />
                </div>
                <div className="event-foot">
                  <span className="muted">
                    <AnimatedNumber value={ev.going_count} /> / {ev.max_capacity} going
                  </span>
                  <Link className="btn sm" to={`/events/${ev.id}`}>
                    View & RSVP →
                  </Link>
                </div>
              </div>
            );
          })}
          {shown.length === 0 && (
            <div className="empty" style={{ gridColumn: "1 / -1" }}>
              <div className="icon">🎪</div>
              No events found. Try a different search.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

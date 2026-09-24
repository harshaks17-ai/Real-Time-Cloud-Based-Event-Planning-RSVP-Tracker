import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import { useAuth } from "../hooks/useAuth";
import { usePoll } from "../hooks/usePoll";
import { AnimatedNumber } from "../components/AnimatedNumber";

export default function OrganizerDashboard() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [rsvps, setRsvps] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() =>
    Promise.all([api.myEvents(), api.myRsvps()])
      .then(([e, r]) => { setEvents(e); setRsvps(r); setError(""); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false)),
  []);

  // live refresh every 2.5s so RSVP changes appear without navigation
  usePoll(load, 2500);

  const mine = events;
  const upcoming = mine.filter((e) => ["PUBLISHED", "FULL"].includes(e.status));
  const totalGoing = mine.reduce((s, e) => s + e.going_count, 0);
  const totalCapacity = mine.reduce((s, e) => s + e.max_capacity, 0);

  return (
    <div className="container">
      <div className="section-head">
        <div>
          <div className="hero-kicker" style={{ marginBottom: 10 }}>Command center</div>
          <h2 className="page-title">Organizer dashboard</h2>
          <p className="muted" style={{ marginTop: 6 }}>
            Welcome back, <strong style={{ color: "#fff" }}>{user?.name}</strong>. Here's your event pulse.
          </p>
        </div>
        <Link className="btn lg" to="/organizer/new">+ Create event</Link>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="grid cols-4" style={{ margin: "8px 0 20px" }}>
        <div className="card stat-card">
          <div className="icon-blob">🎪</div>
          <h3>Total events</h3>
          <div className="big"><AnimatedNumber value={mine.length} /></div>
        </div>
        <div className="card stat-card">
          <div className="icon-blob" style={{ background: "rgba(61,255,176,.14)" }}>🚀</div>
          <h3>Upcoming</h3>
          <div className="big stat-going"><AnimatedNumber value={upcoming.length} /></div>
        </div>
        <div className="card stat-card">
          <div className="icon-blob" style={{ background: "rgba(79,216,255,.14)" }}>✅</div>
          <h3>Total GOING</h3>
          <div className="big stat-wait"><AnimatedNumber value={totalGoing} /></div>
          <div className="sub">across all events</div>
        </div>
        <div className="card stat-card">
          <div className="icon-blob" style={{ background: "rgba(255,209,102,.14)" }}>🎟️</div>
          <h3>Seats capacity</h3>
          <div className="big stat-maybe"><AnimatedNumber value={totalCapacity} /></div>
        </div>
      </div>

      <div className="card">
        <h3>📋 My events</h3>
        {loading ? (
          <div>
            <div className="skeleton" /><div className="skeleton" /><div className="skeleton" />
          </div>
        ) : mine.length === 0 ? (
          <div className="empty">
            <div className="icon">✨</div>
            No events yet — create your first one and watch RSVPs roll in.
            <div style={{ marginTop: 14 }}>
              <Link className="btn" to="/organizer/new">Create event →</Link>
            </div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Event</th><th>Date</th><th>Capacity</th><th>Going</th><th>Status</th><th></th>
                </tr>
              </thead>
              <tbody>
                {mine.map((ev) => (
                  <tr key={ev.id}>
                    <td><strong>{ev.name}</strong></td>
                    <td className="muted">{ev.event_date}</td>
                    <td>{ev.max_capacity}</td>
                    <td className="stat-going"><AnimatedNumber value={ev.going_count} /></td>
                    <td><span className={`badge ${ev.status}`}>{ev.status}</span></td>
                    <td><Link to={`/organizer/events/${ev.id}`}>Manage →</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

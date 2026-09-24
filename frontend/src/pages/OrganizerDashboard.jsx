import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import { useAuth } from "../hooks/useAuth";

export default function OrganizerDashboard() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [rsvps, setRsvps] = useState([]);
  const [error, setError] = useState("");

  const load = () =>
    Promise.all([api.myEvents(), api.myRsvps()])
      .then(([e, r]) => { setEvents(e); setRsvps(r); })
      .catch((err) => setError(err.message));

  useEffect(() => { load(); }, []);

  const mine = events;
  const upcoming = mine.filter((e) => ["PUBLISHED", "FULL"].includes(e.status));
  const totalGoing = mine.reduce((s, e) => s + e.going_count, 0);
  const totalResponses = mine.reduce((s, e) => s + e.going_count, 0);
  const myResponded = rsvps.length;

  return (
    <div className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>Organizer dashboard</h2>
        <Link className="btn" to="/organizer/new">+ Create event</Link>
      </div>
      <p className="muted">Welcome back, {user?.name}.</p>
      {error && <div className="error">{error}</div>}

      <div className="grid cols-4" style={{ margin: "16px 0" }}>
        <div className="card"><h3>Total events</h3><div className="big">{mine.length}</div></div>
        <div className="card"><h3>Upcoming</h3><div className="big">{upcoming.length}</div></div>
        <div className="card"><h3>Total GOING (all events)</h3><div className="big stat-going">{totalGoing}</div></div>
        <div className="card"><h3>My responses (as attendee)</h3><div className="big stat-wait">{myResponded}</div></div>
      </div>

      <div className="card">
        <h3>My events</h3>
        <table>
          <thead>
            <tr>
              <th>Event</th><th>Date</th><th>Capacity</th><th>Going</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {mine.map((ev) => (
              <tr key={ev.id}>
                <td>{ev.name}</td>
                <td>{ev.event_date}</td>
                <td>{ev.max_capacity}</td>
                <td className="stat-going">{ev.going_count}</td>
                <td><span className={`badge ${ev.status}`}>{ev.status}</span></td>
                <td>
                  <Link to={`/organizer/events/${ev.id}`}>Manage</Link>
                </td>
              </tr>
            ))}
            {mine.length === 0 && (
              <tr><td colSpan={6} className="muted">No events yet — create your first one.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

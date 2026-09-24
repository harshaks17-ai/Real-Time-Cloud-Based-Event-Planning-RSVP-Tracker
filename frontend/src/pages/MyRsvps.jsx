import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import { usePoll } from "../hooks/usePoll";

export default function MyRsvps() {
  const [rsvps, setRsvps] = useState([]);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState("");

  const load = () =>
    Promise.all([api.myRsvps(), api.listEvents()])
      .then(([r, e]) => { setRsvps(r); setEvents(e); })
      .catch((err) => setError(err.message));

  usePoll(load, 4000);

  const byId = Object.fromEntries(events.map((e) => [e.id, e]));
  const today = new Date().toISOString().slice(0, 10);

  const upcoming = rsvps.filter((r) => byId[r.event_id] && byId[r.event_id].event_date >= today);
  const past = rsvps.filter((r) => byId[r.event_id] && byId[r.event_id].event_date < today);

  const Section = ({ title, icon, list }) => (
    <div className="card" style={{ marginTop: 16 }}>
      <h3>{icon} {title} ({list.length})</h3>
      {list.length === 0 ? (
        <div className="empty">
          <div className="icon">{icon}</div>
          Nothing here yet — <Link to="/">discover events</Link>.
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Event</th><th>Date</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {list.map((r) => {
                const ev = byId[r.event_id];
                return (
                  <tr key={r.id}>
                    <td><strong>{ev?.name}</strong></td>
                    <td className="muted">{ev?.event_date}</td>
                    <td><span className={`badge ${r.status}`}>{r.status.replace("_", " ")}</span></td>
                    <td><Link to={`/events/${r.event_id}`}>Open →</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <div className="container">
      <div className="hero-kicker" style={{ marginBottom: 10 }}>Your schedule</div>
      <h2 className="page-title">My RSVPs</h2>
      {error && <div className="error">{error}</div>}
      <Section title="Upcoming" icon="🚀" list={upcoming} />
      <Section title="Past" icon="📜" list={past} />
    </div>
  );
}

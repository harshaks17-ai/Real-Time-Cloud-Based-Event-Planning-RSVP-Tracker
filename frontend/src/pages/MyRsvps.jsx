import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";

export default function MyRsvps() {
  const [rsvps, setRsvps] = useState([]);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.myRsvps(), api.listEvents()])
      .then(([r, e]) => { setRsvps(r); setEvents(e); })
      .catch((err) => setError(err.message));
  }, []);

  const byId = Object.fromEntries(events.map((e) => [e.id, e]));
  const today = new Date().toISOString().slice(0, 10);

  const upcoming = rsvps.filter((r) => byId[r.event_id] && byId[r.event_id].event_date >= today);
  const past = rsvps.filter((r) => byId[r.event_id] && byId[r.event_id].event_date < today);

  const Section = ({ title, list }) => (
    <div className="card" style={{ marginTop: 16 }}>
      <h3>{title}</h3>
      {list.length === 0 && <div className="muted">Nothing here yet.</div>}
      <table>
        <thead>
          <tr><th>Event</th><th>Date</th><th>Status</th><th></th></tr>
        </thead>
        <tbody>
          {list.map((r) => {
            const ev = byId[r.event_id];
            return (
              <tr key={r.id}>
                <td>{ev?.name}</td>
                <td>{ev?.event_date}</td>
                <td><span className={`badge ${r.status}`}>{r.status.replace("_", " ")}</span></td>
                <td><Link to={`/events/${r.event_id}`}>Open</Link></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="container">
      <h2>My RSVPs</h2>
      {error && <div className="error">{error}</div>}
      <Section title="Upcoming" list={upcoming} />
      <Section title="Past" list={past} />
    </div>
  );
}

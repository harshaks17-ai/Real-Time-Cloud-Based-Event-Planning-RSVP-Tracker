import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../services/api";
import { useEventSocket } from "../hooks/useEventSocket";
import { CountsBar } from "../components/CountsBar";
import { Donut, LineChart, CapacityBar } from "../components/Charts";
import Toast from "../components/Toast";

export default function ManageEvent() {
  const { id } = useParams();
  const nav = useNavigate();
  const [event, setEvent] = useState(null);
  const [rsvps, setRsvps] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [anns, setAnns] = useState([]);
  const [annForm, setAnnForm] = useState({ title: "", message: "" });
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const { counts, connected } = useEventSocket(id);

  const load = async () => {
    try {
      const [ev, r, a, an] = await Promise.all([
        api.getEvent(id),
        api.eventRsvps(id),
        api.analytics(id),
        api.announcements(id),
      ]);
      setEvent(ev); setRsvps(r); setAnalytics(a); setAnns(an);
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => { load(); }, [id]);

  const cancelEvent = async () => {
    if (!confirm("Cancel this event? All attendees will be notified.")) return;
    try {
      await api.cancelEvent(id);
      setToast("Event cancelled — attendees notified");
      load();
    } catch (e) { setError(e.message); }
  };

  const del = async () => {
    if (!confirm("Permanently delete this event?")) return;
    try {
      await api.deleteEvent(id);
      nav("/organizer");
    } catch (e) { setError(e.message); }
  };

  const postAnn = async (e) => {
    e.preventDefault();
    try {
      await api.createAnnouncement(id, annForm);
      setAnnForm({ title: "", message: "" });
      setToast("Announcement published — notifications sent");
      setAnns(await api.announcements(id));
    } catch (err) { setError(err.message); }
  };

  if (!event) return <div className="container muted">{error || "Loading…"}</div>;

  return (
    <div className="container">
      <Toast message={toast} onDone={() => setToast("")} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ marginBottom: 4 }}>{event.name}</h2>
          <span className={`badge ${event.status}`}>{event.status}</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link className="btn ghost sm" to={`/events/${event.id}`}>Public view</Link>
          {event.status !== "CANCELLED" && (
            <button className="btn danger sm" onClick={cancelEvent}>Cancel event</button>
          )}
          <button className="btn ghost sm" onClick={del}>Delete</button>
        </div>
      </div>
      <p className="muted">
        {event.event_date} · {event.start_time}–{event.end_time} · {event.venue || event.online_link}
      </p>

      <div style={{ margin: "14px 0" }}>
        <CountsBar counts={counts || analytics} connected={connected} />
      </div>

      <div className="grid cols-2" style={{ marginTop: 16 }}>
        <div className="card">
          <h3>RSVP status distribution</h3>
          <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
            <Donut data={[
              { key: "going", label: "Going", value: analytics?.going || 0 },
              { key: "maybe", label: "Maybe", value: analytics?.maybe || 0 },
              { key: "not_going", label: "Not Going", value: analytics?.not_going || 0 },
              { key: "waitlisted", label: "Waitlisted", value: analytics?.waitlisted || 0 },
            ]} />
            <div className="muted">
              <div><span className="stat-going">●</span> Going: {analytics?.going}</div>
              <div><span className="stat-maybe">●</span> Maybe: {analytics?.maybe}</div>
              <div><span className="stat-no">●</span> Not Going: {analytics?.not_going}</div>
              <div><span className="stat-wait">●</span> Waitlisted: {analytics?.waitlisted}</div>
            </div>
          </div>
        </div>

        <div className="card">
          <h3>Capacity utilization</h3>
          <CapacityBar going={analytics?.going || 0} capacity={analytics?.capacity || event.max_capacity} />
          <div className="muted" style={{ marginTop: 10 }}>
            Response rate: {analytics?.response_rate}% · Available: {analytics?.available_seats}
          </div>
        </div>

        <div className="card" style={{ gridColumn: "1 / -1" }}>
          <h3>RSVP growth over time (GOING)</h3>
          <LineChart points={analytics?.growth || []} />
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>Attendees ({rsvps.length})</h3>
        <table>
          <thead>
            <tr><th>Name</th><th>Email</th><th>Status</th><th>Responded</th></tr>
          </thead>
          <tbody>
            {rsvps.map((r) => (
              <tr key={r.id}>
                <td>{r.user_name}</td>
                <td>{r.user_email}</td>
                <td><span className={`badge ${r.status}`}>{r.status.replace("_", " ")}</span></td>
                <td className="muted">{new Date(r.responded_at).toLocaleString()}</td>
              </tr>
            ))}
            {rsvps.length === 0 && <tr><td colSpan={4} className="muted">No responses yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="grid cols-2" style={{ marginTop: 16 }}>
        <div className="card">
          <h3>Post announcement</h3>
          <form onSubmit={postAnn}>
            <label>Title</label>
            <input value={annForm.title} onChange={(e) => setAnnForm({ ...annForm, title: e.target.value })}
                   placeholder="Venue Updated" required />
            <label>Message</label>
            <textarea rows={3} value={annForm.message}
                      onChange={(e) => setAnnForm({ ...annForm, message: e.target.value })}
                      placeholder="Session now in Hall B" required />
            <button className="btn">Publish</button>
          </form>
        </div>
        <div className="card">
          <h3>Recent announcements</h3>
          {anns.length === 0 && <div className="muted">None yet.</div>}
          {anns.map((a) => (
            <div key={a.id} style={{ borderBottom: "1px solid var(--border)", padding: "8px 0" }}>
              <strong>{a.title}</strong>
              <div className="muted">{a.message}</div>
            </div>
          ))}
        </div>
      </div>
      {error && <div className="error">{error}</div>}
    </div>
  );
}

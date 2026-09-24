import { useCallback, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../services/api";
import { useEventSocket } from "../hooks/useEventSocket";
import { usePoll } from "../hooks/usePoll";
import { CountsBar } from "../components/CountsBar";
import { Donut, LineChart, CapacityBar } from "../components/Charts";
import { AnimatedNumber } from "../components/AnimatedNumber";
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
  const { counts, setCounts, connected } = useEventSocket(id);

  const load = useCallback(async () => {
    try {
      const [ev, r, a, an, c] = await Promise.all([
        api.getEvent(id),
        api.eventRsvps(id),
        api.analytics(id),
        api.announcements(id),
        api.counts(id),
      ]);
      setEvent(ev); setRsvps(r); setAnalytics(a); setAnns(an);
      setCounts(c);
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }, [id, setCounts]);

  // WS pushes instant counts; poll keeps attendee table + analytics fresh
  usePoll(load, 3000);

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

  if (!event)
    return (
      <div className="container">
        <div className="skeleton" style={{ width: "45%", height: 34 }} />
        <div className="skeleton" style={{ width: "80%" }} />
        <div className="skeleton" style={{ width: "70%" }} />
      </div>
    );

  return (
    <div className="container">
      <Toast message={toast} onDone={() => setToast("")} />

      <div className="section-head">
        <div>
          <div className="hero-kicker" style={{ marginBottom: 10 }}>Manage · Live</div>
          <h2 className="page-title">{event.name}</h2>
          <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center" }}>
            <span className={`badge ${event.status}`}>{event.status}</span>
            <span className="live-label">
              <span className={`live-dot ${connected ? "" : "off"}`} />
              {connected ? "Streaming" : "Reconnecting"}
            </span>
          </div>
        </div>
        <div className="btn-row">
          <Link className="btn ghost sm" to={`/events/${event.id}`}>Public view</Link>
          {event.status !== "CANCELLED" && (
            <button className="btn danger sm" onClick={cancelEvent}>Cancel event</button>
          )}
          <button className="btn ghost sm" onClick={del}>Delete</button>
        </div>
      </div>

      <p className="muted" style={{ marginBottom: 16 }}>
        📅 {event.event_date} · ⏰ {event.start_time}–{event.end_time} · 📍 {event.venue || event.online_link}
      </p>

      <div style={{ marginBottom: 18 }}>
        <CountsBar counts={counts || analytics} connected={connected} />
      </div>

      <div className="grid cols-2">
        <div className="card">
          <h3>RSVP status distribution</h3>
          <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
            <Donut
              data={[
                { key: "going", label: "Going", value: analytics?.going || 0 },
                { key: "maybe", label: "Maybe", value: analytics?.maybe || 0 },
                { key: "not_going", label: "Not Going", value: analytics?.not_going || 0 },
                { key: "waitlisted", label: "Waitlisted", value: analytics?.waitlisted || 0 },
              ]}
            />
            <div className="chart-legend">
              <div><i style={{ background: "#3dffb0" }} /> Going: <strong style={{ color: "#fff" }}>{analytics?.going}</strong></div>
              <div><i style={{ background: "#ffd166" }} /> Maybe: <strong style={{ color: "#fff" }}>{analytics?.maybe}</strong></div>
              <div><i style={{ background: "#ff6b9d" }} /> Not Going: <strong style={{ color: "#fff" }}>{analytics?.not_going}</strong></div>
              <div><i style={{ background: "#4fd8ff" }} /> Waitlisted: <strong style={{ color: "#fff" }}>{analytics?.waitlisted}</strong></div>
            </div>
          </div>
        </div>

        <div className="card">
          <h3>Capacity utilization</h3>
          <CapacityBar going={analytics?.going || 0} capacity={analytics?.capacity || event.max_capacity} />
          <div className="grid cols-3" style={{ marginTop: 16, gap: 10 }}>
            <div>
              <div className="muted" style={{ fontSize: 11 }}>RESPONSE RATE</div>
              <div style={{ fontSize: 22, fontWeight: 800 }} className="stat-wait">
                <AnimatedNumber value={analytics?.response_rate || 0} />%
              </div>
            </div>
            <div>
              <div className="muted" style={{ fontSize: 11 }}>AVAILABLE</div>
              <div style={{ fontSize: 22, fontWeight: 800 }} className="stat-going">
                <AnimatedNumber value={analytics?.available_seats || 0} />
              </div>
            </div>
            <div>
              <div className="muted" style={{ fontSize: 11 }}>UTILIZATION</div>
              <div style={{ fontSize: 22, fontWeight: 800 }} className="stat-maybe">
                <AnimatedNumber value={analytics?.capacity_utilization || 0} />%
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ gridColumn: "1 / -1" }}>
          <h3>RSVP growth over time (GOING)</h3>
          <LineChart points={analytics?.growth || []} />
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>👥 Attendees ({rsvps.length})</h3>
        {rsvps.length === 0 ? (
          <div className="empty">
            <div className="icon">🧑‍🤝‍🧑</div>
            No responses yet — share the event link!
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Name</th><th>Email</th><th>Status</th><th>Responded</th></tr>
              </thead>
              <tbody>
                {rsvps.map((r) => (
                  <tr key={r.id}>
                    <td><strong>{r.user_name}</strong></td>
                    <td className="muted">{r.user_email}</td>
                    <td><span className={`badge ${r.status}`}>{r.status.replace("_", " ")}</span></td>
                    <td className="muted">{new Date(r.responded_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid cols-2" style={{ marginTop: 16 }}>
        <div className="card">
          <h3>📣 Post announcement</h3>
          <form onSubmit={postAnn}>
            <label>Title</label>
            <input
              value={annForm.title}
              onChange={(e) => setAnnForm({ ...annForm, title: e.target.value })}
              placeholder="Venue Updated"
              required
            />
            <label>Message</label>
            <textarea
              rows={3}
              value={annForm.message}
              onChange={(e) => setAnnForm({ ...annForm, message: e.target.value })}
              placeholder="Session now in Hall B"
              required
            />
            <button className="btn">Publish →</button>
          </form>
        </div>
        <div className="card">
          <h3>📢 Recent announcements</h3>
          {anns.length === 0 && (
            <div className="empty" style={{ padding: 16 }}>
              <div className="icon">📭</div>
              None yet.
            </div>
          )}
          {anns.map((a, i) => (
            <div className="ann-item" key={a.id} style={{ animationDelay: `${i * 0.06}s` }}>
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

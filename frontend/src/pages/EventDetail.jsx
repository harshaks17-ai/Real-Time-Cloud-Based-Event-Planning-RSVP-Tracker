import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../services/api";
import { useAuth } from "../hooks/useAuth";
import { useEventSocket } from "../hooks/useEventSocket";
import { CountsBar } from "../components/CountsBar";
import Toast from "../components/Toast";

export default function EventDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [event, setEvent] = useState(null);
  const [myStatus, setMyStatus] = useState(null);
  const [anns, setAnns] = useState([]);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const { counts, setCounts, connected } = useEventSocket(id);

  const load = async () => {
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
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => { load(); }, [id]);

  const respond = async (status) => {
    setError("");
    try {
      const r = myStatus ? await api.updateRsvp(id, status) : await api.rsvp(id, status);
      setMyStatus(r.status);
      setCounts((prev) => ({
        ...prev,
        going: (prev?.going ?? 0) + (r.status === "GOING" ? 1 : 0) - (status === "GOING" ? 0 : 0),
      }));
      setToast(`Your RSVP has been recorded: ${r.status.replace("_", " ")}`);
      const c = await api.counts(id);
      setCounts(c);
    } catch (e) {
      setError(e.message);
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

  if (!event) return <div className="container muted">{error || "Loading…"}</div>;

  const isOwner = user?.id === event.organizer_id;

  return (
    <div className="container">
      <Toast message={toast} onDone={() => setToast("")} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ marginBottom: 4 }}>{event.name}</h2>
          <span className={`badge ${event.status}`}>{event.status}</span>{" "}
          <span className="muted">{event.event_type}</span>
        </div>
        {isOwner && <Link className="btn ghost sm" to={`/organizer/events/${event.id}`}>Manage</Link>}
      </div>

      <p className="muted">
        {event.event_date} · {event.start_time}–{event.end_time} · {event.venue || event.online_link}
      </p>
      <p>{event.description}</p>
      <p className="muted">Organizer: {event.organizer_name} · Deadline: {event.registration_deadline}</p>

      <h3>Live counts <span className={`live-dot ${connected ? "" : "off"}`} />{connected ? "connected" : "reconnecting…"}</h3>
      <CountsBar counts={counts} connected={connected} />

      {user && (
        <div className="card" style={{ marginTop: 18 }}>
          <h3>Your RSVP</h3>
          {myStatus ? (
            <>
              <p>
                Current: <span className={`badge ${myStatus}`}>{myStatus.replace("_", " ")}</span>
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className={`btn going ${myStatus === "GOING" ? "active" : ""}`} onClick={() => respond("GOING")}>Going</button>
                <button className={`btn maybe ${myStatus === "MAYBE" ? "active" : ""}`} onClick={() => respond("MAYBE")}>Maybe</button>
                <button className={`btn no ${myStatus === "NOT_GOING" ? "active" : ""}`} onClick={() => respond("NOT_GOING")}>Not Going</button>
                <button className="btn ghost" onClick={cancel}>Cancel RSVP</button>
              </div>
            </>
          ) : (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="btn going" onClick={() => respond("GOING")}>Going</button>
              <button className="btn maybe" onClick={() => respond("MAYBE")}>Maybe</button>
              <button className="btn no" onClick={() => respond("NOT_GOING")}>Not Going</button>
            </div>
          )}
          {error && <div className="error">{error}</div>}
          {myStatus === "WAITLISTED" && (
            <p className="muted">Event is full — you are on the waitlist and will be promoted automatically if a seat opens.</p>
          )}
        </div>
      )}

      <div className="card" style={{ marginTop: 18 }}>
        <h3>Announcements</h3>
        {anns.length === 0 && <div className="muted">No announcements.</div>}
        {anns.map((a) => (
          <div key={a.id} style={{ borderBottom: "1px solid var(--border)", padding: "8px 0" }}>
            <strong>{a.title}</strong>
            <div className="muted">{a.message}</div>
            <div className="muted">{new Date(a.created_at).toLocaleString()}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

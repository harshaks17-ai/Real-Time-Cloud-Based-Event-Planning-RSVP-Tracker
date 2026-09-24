import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";

const today = new Date().toISOString().slice(0, 10);
const in7 = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

export default function CreateEvent() {
  const nav = useNavigate();
  const [form, setForm] = useState({
    name: "",
    description: "",
    event_type: "workshop",
    event_date: in7,
    start_time: "10:00",
    end_time: "13:00",
    venue: "",
    online_link: "",
    max_capacity: 100,
    registration_deadline: today,
    status: "PUBLISHED",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const ev = await api.createEvent({ ...form, max_capacity: Number(form.max_capacity) });
      nav(`/organizer/events/${ev.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: 640 }}>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Create event</h2>
        <form onSubmit={submit}>
          <label>Event name</label>
          <input value={form.name} onChange={set("name")} required placeholder="Cloud Computing Workshop" />
          <label>Description</label>
          <textarea rows={3} value={form.description} onChange={set("description")} />
          <div className="grid cols-2">
            <div>
              <label>Type</label>
              <select value={form.event_type} onChange={set("event_type")}>
                <option value="workshop">Workshop</option>
                <option value="conference">Conference</option>
                <option value="meetup">Meetup</option>
                <option value="webinar">Webinar</option>
                <option value="fest">College Fest</option>
                <option value="wedding">Wedding</option>
              </select>
            </div>
            <div>
              <label>Max capacity</label>
              <input type="number" min={1} value={form.max_capacity} onChange={set("max_capacity")} required />
            </div>
            <div>
              <label>Event date</label>
              <input type="date" value={form.event_date} onChange={set("event_date")} required />
            </div>
            <div>
              <label>Registration deadline</label>
              <input type="date" value={form.registration_deadline} onChange={set("registration_deadline")} required />
            </div>
            <div>
              <label>Start time</label>
              <input type="time" value={form.start_time} onChange={set("start_time")} required />
            </div>
            <div>
              <label>End time</label>
              <input type="time" value={form.end_time} onChange={set("end_time")} required />
            </div>
          </div>
          <label>Venue</label>
          <input value={form.venue} onChange={set("venue")} placeholder="Hall A / Main Auditorium" />
          <label>Online link (optional)</label>
          <input value={form.online_link} onChange={set("online_link")} placeholder="https://meet.example.com/xyz" />
          <label>Status</label>
          <select value={form.status} onChange={set("status")}>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
          </select>
          {error && <div className="error">{error}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn" disabled={busy}>{busy ? "Saving…" : "Create event"}</button>
            <button type="button" className="btn ghost" onClick={() => nav(-1)}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

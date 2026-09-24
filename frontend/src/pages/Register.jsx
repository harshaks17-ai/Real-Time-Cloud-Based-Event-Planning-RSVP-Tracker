import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "attendee" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const user = await register(form);
      nav(user.role === "organizer" ? "/organizer" : "/");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="hero-kicker" style={{ marginBottom: 14 }}>✦ Join the platform</div>
        <h2>Create your <span className="grad-text">account</span></h2>
        <p className="muted" style={{ marginBottom: 22 }}>
          Free forever for students · takes less than a minute.
        </p>
        <form onSubmit={submit}>
          <label>Full name</label>
          <input value={form.name} onChange={set("name")} placeholder="Ada Lovelace" required />
          <label>Email</label>
          <input type="email" value={form.email} onChange={set("email")} placeholder="you@example.com" required />
          <label>Password</label>
          <input
            type="password"
            value={form.password}
            onChange={set("password")}
            minLength={6}
            placeholder="Min 6 characters"
            required
          />
          <label>I want to…</label>
          <select value={form.role} onChange={set("role")}>
            <option value="attendee">Attend events (Attendee)</option>
            <option value="organizer">Host events (Organizer)</option>
          </select>
          {error && <div className="error">{error}</div>}
          <button className="btn lg block" disabled={busy}>
            {busy ? "Creating account…" : "Create account →"}
          </button>
        </form>
        <p className="muted" style={{ marginTop: 18 }}>
          Already registered? <Link to="/login">Sign in</Link>
        </p>
      </div>

      <div className="auth-aside">
        <div className="hero-kicker">Why organizers love it</div>
        <h3>
          From invite to <span className="grad-text">check-in</span>, one cloud flow.
        </h3>
        <ul>
          <li><span className="tick">✓</span> Publish events with capacity & deadlines</li>
          <li><span className="tick">✓</span> Live Going / Maybe / Not Going analytics</li>
          <li><span className="tick">✓</span> Announcements push to every attendee bell</li>
          <li><span className="tick">✓</span> Race-safe seat claiming under load</li>
        </ul>
      </div>
    </div>
  );
}

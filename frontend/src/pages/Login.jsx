import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const user = await login(email, password);
      nav(user.role === "organizer" ? "/organizer" : "/");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const fill = (em) => { setEmail(em); setPassword("Demo@123"); };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="hero-kicker" style={{ marginBottom: 14 }}>✦ Welcome back</div>
        <h2>Sign in to <span className="grad-text">RSVP Cloud</span></h2>
        <p className="muted" style={{ marginBottom: 22 }}>
          Live dashboards, capacity control, and real-time RSVPs await.
        </p>
        <form onSubmit={submit}>
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
          {error && <div className="error">{error}</div>}
          <button className="btn lg block" disabled={busy}>
            {busy ? "Signing in…" : "Sign in →"}
          </button>
        </form>

        <div style={{ marginTop: 18, padding: "14px", background: "rgba(108,140,255,.08)", border: "1px solid rgba(108,140,255,.25)", borderRadius: 12 }}>
          <div className="muted" style={{ marginBottom: 8, fontWeight: 700 }}>⚡ Demo accounts (click to fill)</div>
          <div className="btn-row">
            <button type="button" className="btn ghost sm" onClick={() => fill("alice@example.com")}>
              Organizer · alice@example.com
            </button>
            <button type="button" className="btn ghost sm" onClick={() => fill("bob@example.com")}>
              Attendee · bob@example.com
            </button>
          </div>
        </div>

        <p className="muted" style={{ marginTop: 18 }}>
          No account? <Link to="/register">Create one free</Link>
        </p>
      </div>

      <div className="auth-aside">
        <div className="hero-kicker">Real-time cloud platform</div>
        <h3>
          Watch RSVPs land <span className="grad-text">live</span> — no refresh needed.
        </h3>
        <ul>
          <li><span className="tick">✓</span> WebSocket push updates organizer dashboards instantly</li>
          <li><span className="tick">✓</span> Atomic capacity control stops overbooking races</li>
          <li><span className="tick">✓</span> FIFO waitlist auto-promotes when seats open</li>
          <li><span className="tick">✓</span> JWT auth + role-based access out of the box</li>
        </ul>
      </div>
    </div>
  );
}

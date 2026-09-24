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
    <div className="container" style={{ maxWidth: 420 }}>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Create account</h2>
        <form onSubmit={submit}>
          <label>Full name</label>
          <input value={form.name} onChange={set("name")} required />
          <label>Email</label>
          <input type="email" value={form.email} onChange={set("email")} required />
          <label>Password (min 6 chars)</label>
          <input type="password" value={form.password} onChange={set("password")} minLength={6} required />
          <label>Role</label>
          <select value={form.role} onChange={set("role")}>
            <option value="attendee">Attendee</option>
            <option value="organizer">Organizer</option>
          </select>
          {error && <div className="error">{error}</div>}
          <button className="btn" disabled={busy} style={{ width: "100%" }}>
            {busy ? "Creating…" : "Register"}
          </button>
        </form>
        <p className="muted">
          Already registered? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}

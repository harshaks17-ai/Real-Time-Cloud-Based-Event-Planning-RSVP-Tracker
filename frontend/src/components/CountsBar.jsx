export function CountsBar({ counts, connected }) {
  if (!counts) return <div className="muted">Loading live counts…</div>;
  const pct = counts.capacity ? Math.round((counts.going / counts.capacity) * 100) : 0;
  return (
    <div className="grid cols-4">
      <div className="card">
        <h3><span className={`live-dot ${connected ? "" : "off"}`} />
          {connected ? "LIVE" : "RECONNECTING"} · Going</h3>
        <div className="big stat-going">{counts.going}</div>
        <div className="muted">/ {counts.capacity} seats</div>
      </div>
      <div className="card">
        <h3>Maybe</h3>
        <div className="big stat-maybe">{counts.maybe}</div>
      </div>
      <div className="card">
        <h3>Not Going</h3>
        <div className="big stat-no">{counts.not_going}</div>
      </div>
      <div className="card">
        <h3>Waitlist</h3>
        <div className="big stat-wait">{counts.waitlisted}</div>
        <div className="muted">{counts.available} seats left · {counts.response_rate}% response</div>
        <div className="progress" style={{ marginTop: 8 }}>
          <div style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}

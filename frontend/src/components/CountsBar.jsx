import { AnimatedNumber } from "./AnimatedNumber";

export function CountsBar({ counts, connected }) {
  if (!counts) {
    return (
      <div className="grid cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div className="card" key={i}>
            <div className="skeleton" style={{ width: "60%" }} />
            <div className="skeleton" style={{ width: "40%", height: 34 }} />
          </div>
        ))}
      </div>
    );
  }

  const pct = counts.capacity ? Math.min(100, Math.round((counts.going / counts.capacity) * 100)) : 0;

  return (
    <div className="grid cols-4">
      <div className="card stat-card">
        <div className="icon-blob">🎟️</div>
        <h3>
          <span className={`live-dot ${connected ? "" : "off"}`} />{" "}
          <span className={`live-label ${connected ? "" : "off"}`}>
            {connected ? "Live" : "Reconnecting"}
          </span>
        </h3>
        <div className="big stat-going">
          <AnimatedNumber value={counts.going} />
        </div>
        <div className="sub">Going · / {counts.capacity} seats</div>
        <div className="mini-bar" style={{ marginTop: 10 }}>
          <div style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="card stat-card">
        <div className="icon-blob" style={{ background: "rgba(255,209,102,.14)" }}>🤔</div>
        <h3>Maybe</h3>
        <div className="big stat-maybe">
          <AnimatedNumber value={counts.maybe} />
        </div>
        <div className="sub">Tentative responses</div>
      </div>

      <div className="card stat-card">
        <div className="icon-blob" style={{ background: "rgba(255,107,157,.14)" }}>❌</div>
        <h3>Not Going</h3>
        <div className="big stat-no">
          <AnimatedNumber value={counts.not_going} />
        </div>
        <div className="sub">Declined</div>
      </div>

      <div className="card stat-card">
        <div className="icon-blob" style={{ background: "rgba(79,216,255,.14)" }}>⏳</div>
        <h3>Waitlist</h3>
        <div className="big stat-wait">
          <AnimatedNumber value={counts.waitlisted} />
        </div>
        <div className="sub">
          {counts.available} seats left · {counts.response_rate}% response rate
        </div>
      </div>
    </div>
  );
}

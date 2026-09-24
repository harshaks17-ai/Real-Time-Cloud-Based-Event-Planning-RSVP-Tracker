const COLORS = { going: "#2ecc8f", maybe: "#f4b942", not_going: "#ff6b6b", waitlisted: "#4f8cff" };

export function Donut({ data }) {
  // data: [{label, value}]
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  let acc = 0;
  const r = 60, c = 2 * Math.PI * r;
  return (
    <svg width="180" height="180" viewBox="0 0 180 180">
      <g transform="translate(90,90) rotate(-90)">
        {data.filter(d => d.value > 0).map((d) => {
          const frac = d.value / total;
          const dash = `${frac * c} ${c}`;
          const offset = -acc * c;
          acc += frac;
          return (
            <circle
              key={d.label}
              r={r} fill="none"
              stroke={COLORS[d.key] || "#4f8cff"}
              strokeWidth="22"
              strokeDasharray={dash}
              strokeDashoffset={offset}
            />
          );
        })}
      </g>
      <text x="90" y="86" textAnchor="middle" style={{ fontSize: 22, fill: "#e8ecf8", fontWeight: 700 }}>
        {total}
      </text>
      <text x="90" y="106" textAnchor="middle">responses</text>
    </svg>
  );
}

export function LineChart({ points }) {
  // points: [{ts, going, maybe, ...}]
  if (!points || points.length < 2) {
    return <div className="muted">Not enough RSVP history yet.</div>;
  }
  const w = 560, h = 180, pad = 30;
  const max = Math.max(...points.map((p) => p.going), 1);
  const x = (i) => pad + (i / (points.length - 1)) * (w - pad * 2);
  const y = (v) => h - pad - (v / max) * (h - pad * 2);
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p.going)}`).join(" ");
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`}>
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line x1={pad} x2={w - pad} y1={y(max * f)} y2={y(max * f)} stroke="#273156" />
          <text x={4} y={y(max * f) + 4}>{Math.round(max * f)}</text>
        </g>
      ))}
      <path d={path} fill="none" stroke="#2ecc8f" strokeWidth="2.5" />
      {points.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.going)} r="3" fill="#2ecc8f" />
      ))}
      <text x={pad} y={h - 6}>first</text>
      <text x={w - pad - 24} y={h - 6}>latest</text>
    </svg>
  );
}

export function CapacityBar({ going, capacity }) {
  const pct = capacity ? Math.min(100, (going / capacity) * 100) : 0;
  return (
    <div>
      <div className="progress" style={{ height: 16 }}>
        <div style={{ width: `${pct}%` }} />
      </div>
      <div className="muted" style={{ marginTop: 6 }}>
        {going}/{capacity} seats used ({pct.toFixed(1)}%)
      </div>
    </div>
  );
}

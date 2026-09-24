const COLORS = { going: "#3dffb0", maybe: "#ffd166", not_going: "#ff6b9d", waitlisted: "#4fd8ff" };

export function Donut({ data }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  let acc = 0;
  const r = 58;
  const c = 2 * Math.PI * r;

  return (
    <svg width="180" height="180" viewBox="0 0 180 180">
      <circle cx="90" cy="90" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="22" />
      <g transform="translate(90,90) rotate(-90)">
        {data
          .filter((d) => d.value > 0)
          .map((d) => {
            const frac = d.value / total;
            const dash = `${frac * c} ${c}`;
            const offset = -acc * c;
            acc += frac;
            return (
              <circle
                key={d.label}
                className="donut-seg"
                r={r}
                fill="none"
                stroke={COLORS[d.key] || "#6c8cff"}
                strokeWidth="22"
                strokeLinecap="butt"
                strokeDasharray={dash}
                strokeDashoffset={offset}
              />
            );
          })}
      </g>
      <text x="90" y="88" textAnchor="middle" style={{ fontSize: 26, fill: "#eef1ff", fontWeight: 800 }}>
        {data.reduce((s, d) => s + d.value, 0)}
      </text>
      <text x="90" y="108" textAnchor="middle">responses</text>
    </svg>
  );
}

export function LineChart({ points }) {
  if (!points || points.length < 2) {
    return <div className="empty"><div className="icon">📈</div>Not enough RSVP history yet.</div>;
  }
  const w = 560;
  const h = 190;
  const pad = 34;
  const max = Math.max(...points.map((p) => p.going), 1);
  const x = (i) => pad + (i / (points.length - 1)) * (w - pad * 2);
  const y = (v) => h - pad - (v / max) * (h - pad * 2);
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p.going)}`).join(" ");
  const area = `${path} L${x(points.length - 1)},${h - pad} L${pad},${h - pad} Z`;

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`}>
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3dffb0" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#3dffb0" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#6c8cff" />
          <stop offset="100%" stopColor="#3dffb0" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line x1={pad} x2={w - pad} y1={y(max * f)} y2={y(max * f)} stroke="rgba(255,255,255,0.06)" />
          <text x={4} y={y(max * f) + 4}>{Math.round(max * f)}</text>
        </g>
      ))}
      <path d={area} fill="url(#areaGrad)" />
      <path className="line-path" d={path} fill="none" stroke="url(#lineGrad)" strokeWidth="3" strokeLinecap="round" />
      {points.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.going)} r="3.5" fill="#3dffb0" opacity="0.9">
          <animate attributeName="r" values="3;5;3" dur="2s" begin={`${i * 0.05}s`} repeatCount="indefinite" />
        </circle>
      ))}
      <text x={pad} y={h - 8}>first</text>
      <text x={w - pad - 28} y={h - 8}>latest</text>
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
      <div className="muted" style={{ marginTop: 8 }}>
        <strong style={{ color: "#eef1ff" }}>{going}</strong> / {capacity} seats used ({pct.toFixed(1)}%)
      </div>
    </div>
  );
}

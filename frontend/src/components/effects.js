const COLORS = ["#6c8cff", "#3dffb0", "#ffd166", "#ff6b9d", "#b06cff", "#4fd8ff"];

export function burstAt(x, y) {
  for (let i = 0; i < 18; i++) {
    const el = document.createElement("span");
    el.className = "burst";
    const angle = (Math.PI * 2 * i) / 18 + Math.random() * 0.4;
    const dist = 60 + Math.random() * 90;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.background = COLORS[i % COLORS.length];
    el.style.setProperty("--dx", `${Math.cos(angle) * dist}px`);
    el.style.setProperty("--dy", `${Math.sin(angle) * dist}px`);
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 950);
  }
}

export function fireBurstFrom(el, e) {
  const rect = el?.getBoundingClientRect?.();
  const x = e?.clientX ?? (rect ? rect.left + rect.width / 2 : window.innerWidth / 2);
  const y = e?.clientY ?? (rect ? rect.top + rect.height / 2 : window.innerHeight / 2);
  burstAt(x, y);
}

import { useEffect, useRef, useState } from "react";

/** Smoothly animates to target value with a pop on change. */
export function AnimatedNumber({ value = 0, className = "" }) {
  const [display, setDisplay] = useState(value);
  const [pop, setPop] = useState(0);
  const prev = useRef(value);

  useEffect(() => {
    if (value === prev.current) return;
    prev.current = value;
    setPop((p) => p + 1);
    const start = performance.now();
    const from = display;
    const delta = value - from;
    if (delta === 0) return;
    let raf;
    const tick = (t) => {
      const k = Math.min(1, (t - start) / 550);
      const eased = 1 - Math.pow(1 - k, 3);
      setDisplay(Math.round(from + delta * eased));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return (
    <span key={pop} className={`count-pop ${className}`}>
      {display}
    </span>
  );
}

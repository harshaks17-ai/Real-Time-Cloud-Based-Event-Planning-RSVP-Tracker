import { useEffect, useRef } from "react";

/** Repeatedly calls fn on an interval; also refreshes when the tab regains focus. */
export function usePoll(fn, ms = 3000, enabled = true) {
  const ref = useRef(fn);
  ref.current = fn;

  useEffect(() => {
    if (!enabled) return;
    let alive = true;

    const tick = () => {
      if (!alive) return;
      Promise.resolve(ref.current()).catch(() => {});
    };

    tick();
    const id = setInterval(tick, ms);
    const onFocus = () => tick();
    const onVis = () => document.visibilityState === "visible" && tick();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);

    return () => {
      alive = false;
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [ms, enabled]);
}

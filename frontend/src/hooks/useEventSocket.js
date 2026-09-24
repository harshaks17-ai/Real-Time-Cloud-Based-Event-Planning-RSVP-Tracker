import { useEffect, useRef, useState } from "react";

/**
 * Subscribes to /ws/events/{id} and keeps the latest count snapshot in state.
 * Auto-reconnects with backoff (failure-handling demo).
 */
export function useEventSocket(eventId, initial = null) {
  const [counts, setCounts] = useState(initial);
  const [connected, setConnected] = useState(false);
  const retries = useRef(0);

  useEffect(() => {
    if (!eventId) return;
    let closed = false;
    let ws = null;
    let timer = null;

    const connect = () => {
      const proto = location.protocol === "https:" ? "wss" : "ws";
      try {
        ws = new WebSocket(`${proto}://${location.host}/ws/events/${eventId}`);
      } catch {
        scheduleRetry();
        return;
      }
      ws.onopen = () => {
        retries.current = 0;
        setConnected(true);
      };
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === "counts") setCounts(msg);
        } catch {}
      };
      ws.onclose = () => {
        setConnected(false);
        scheduleRetry();
      };
      ws.onerror = () => {
        try { ws.close(); } catch {}
      };
    };

    const scheduleRetry = () => {
      if (closed || retries.current >= 20) return;
      const delay = Math.min(400 * 2 ** retries.current, 8000);
      retries.current += 1;
      timer = setTimeout(connect, delay);
    };

    connect();
    const ping = setInterval(() => ws?.readyState === 1 && ws.send("ping"), 25000);

    return () => {
      closed = true;
      clearInterval(ping);
      clearTimeout(timer);
      ws?.close();
    };
  }, [eventId]);

  return { counts, setCounts, connected };
}

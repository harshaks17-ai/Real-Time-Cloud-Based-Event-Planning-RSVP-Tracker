import { useEffect, useState } from "react";
import { api } from "../services/api";
import { useAuth } from "../hooks/useAuth";

export default function Notifications() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);

  const load = () => api.notifications().then(setItems).catch(() => {});

  useEffect(() => {
    if (!user) return;
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [user]);

  if (!user) return null;
  const unread = items.filter((n) => !n.is_read).length;

  return (
    <div style={{ position: "relative" }}>
      <button className="btn ghost sm" onClick={() => setOpen(!open)}>
        Bell{unread ? ` (${unread})` : ""}
      </button>
      {open && (
        <div className="notif-panel">
          <strong style={{ fontSize: 13 }}>Notifications</strong>
          {items.length === 0 && <div className="muted" style={{ marginTop: 8 }}>No notifications yet.</div>}
          {items.map((n) => (
            <div
              key={n.id}
              className={`notif-item ${n.is_read ? "" : "unread"}`}
              onClick={async () => { if (!n.is_read) { await api.markRead(n.id); load(); } }}
            >
              <div>{n.message}</div>
              <div className="muted">{new Date(n.created_at).toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

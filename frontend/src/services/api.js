const BASE = import.meta.env.VITE_API_URL || "";

function token() {
  return localStorage.getItem("token");
}

async function request(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth && token()) headers.Authorization = `Bearer ${token()}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401 && !path.includes("/login") && !path.includes("/register")) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || `Request failed (${res.status})`);
  return data;
}

export const api = {
  register: (p) => request("/api/register", { method: "POST", body: p, auth: false }),
  login: (p) => request("/api/login", { method: "POST", body: p, auth: false }),
  me: () => request("/api/me"),
  listEvents: (qs = "") => request(`/api/events${qs}`),
  myEvents: () => request("/api/events/mine"),
  getEvent: (id) => request(`/api/events/${id}`),
  createEvent: (p) => request("/api/events", { method: "POST", body: p }),
  updateEvent: (id, p) => request(`/api/events/${id}`, { method: "PUT", body: p }),
  deleteEvent: (id) => request(`/api/events/${id}`, { method: "DELETE" }),
  cancelEvent: (id) => request(`/api/events/${id}/cancel`, { method: "POST" }),
  publishEvent: (id) => request(`/api/events/${id}/publish`, { method: "POST" }),
  rsvp: (id, status) => request(`/api/events/${id}/rsvp`, { method: "POST", body: { status } }),
  updateRsvp: (id, status) => request(`/api/events/${id}/rsvp`, { method: "PUT", body: { status } }),
  cancelRsvp: (id) => request(`/api/events/${id}/rsvp`, { method: "DELETE" }),
  myRsvps: () => request("/api/rsvps/me"),
  counts: (id) => request(`/api/events/${id}/counts`),
  eventRsvps: (id) => request(`/api/events/${id}/rsvps`),
  analytics: (id) => request(`/api/events/${id}/analytics`),
  announcements: (id) => request(`/api/events/${id}/announcements`),
  createAnnouncement: (id, p) =>
    request(`/api/events/${id}/announcements`, { method: "POST", body: p }),
  notifications: () => request("/api/notifications"),
  markRead: (id) => request(`/api/notifications/${id}/read`, { method: "PUT" }),
};

import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Discover from "./pages/Discover";
import EventDetail from "./pages/EventDetail";
import MyRsvps from "./pages/MyRsvps";
import OrganizerDashboard from "./pages/OrganizerDashboard";
import ManageEvent from "./pages/ManageEvent";
import CreateEvent from "./pages/CreateEvent";

function Protected({ children, role }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="container muted">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<Discover />} />
        <Route path="/events/:id" element={<EventDetail />} />
        <Route path="/my-rsvps" element={<Protected><MyRsvps /></Protected>} />
        <Route path="/organizer" element={<Protected role="organizer"><OrganizerDashboard /></Protected>} />
        <Route path="/organizer/new" element={<Protected role="organizer"><CreateEvent /></Protected>} />
        <Route path="/organizer/events/:id" element={<Protected role="organizer"><ManageEvent /></Protected>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

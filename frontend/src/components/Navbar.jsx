import { NavLink, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import Notifications from "./Notifications";

export default function Navbar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  return (
    <nav className="nav">
      <Link to="/" className="brand">
        <span className="brand-mark">⚡</span>
        RSVP Cloud
      </Link>
      {user && (
        <>
          <NavLink to="/" end>Discover</NavLink>
          <NavLink to="/my-rsvps">My RSVPs</NavLink>
          {user.role === "organizer" && <NavLink to="/organizer">Organizer</NavLink>}
        </>
      )}
      <span className="spacer" />
      {user ? (
        <>
          <Notifications />
          <span className="nav-user">
            {user.name} · <strong style={{ color: "#fff" }}>{user.role}</strong>
          </span>
          <button className="btn ghost sm" onClick={() => { logout(); nav("/login"); }}>
            Logout
          </button>
        </>
      ) : (
        <>
          <NavLink to="/login">Login</NavLink>
          <NavLink to="/register" style={{ color: "#fff" }}>Get Started</NavLink>
        </>
      )}
    </nav>
  );
}

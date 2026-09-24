import { useState } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { api } from "../services/api";
import Notifications from "./Notifications";

export default function Navbar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  return (
    <nav className="nav">
      <Link to="/" className="brand">RSVP Tracker</Link>
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
          <span className="muted">{user.name} · {user.role}</span>
          <button
            className="btn ghost sm"
            onClick={() => { logout(); nav("/login"); }}
          >
            Logout
          </button>
        </>
      ) : (
        <>
          <NavLink to="/login">Login</NavLink>
          <NavLink to="/register">Register</NavLink>
        </>
      )}
    </nav>
  );
}

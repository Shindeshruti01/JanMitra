import { NavLink, useNavigate } from "react-router-dom";
import { getSession } from "../api";
import janmitraLogo from "../assets/janmitra-logo.png";

export default function Layout({ role, title, subtitle, navItems, onLogout, children }) {
  const navigate = useNavigate();
  const session = getSession();

  const handleLogout = () => {
    onLogout();
    navigate("/");
  };

  return (
    <div className="app-shell">
      <div className="flag-strip">
        <span className="saffron" />
        <span className="white" />
        <span className="green" />
      </div>

      <header className="topbar">
        <div className="topbar-brand">
          <img className="topbar-logo" src={janmitraLogo} alt="JanMitra System logo" />
          <div>
            <p className="eyebrow">{subtitle}</p>
            <h1>{title}</h1>
            <p className="topbar-subtext">
              Signed in as <strong>{session?.username || "guest"}</strong>
              {" | "}
              {role === "admin" ? "Admin access" : "Registered voter access"}
            </p>
          </div>
        </div>
        <button className="secondary-button" onClick={handleLogout}>
          Logout
        </button>
      </header>

      <div className="portal-body">
        <aside className="sidebar">
          <div className="sidebar-brand">
            <img className="sidebar-logo" src={janmitraLogo} alt="JanMitra System logo" />
            <div>
              <strong>JanMitra System</strong>
              <span>{role === "admin" ? "Officer workspace" : "Citizen workspace"}</span>
            </div>
          </div>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}
            >
              {item.label}
            </NavLink>
          ))}
        </aside>

        <main className="content-panel">{children}</main>
      </div>
    </div>
  );
}

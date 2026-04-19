import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { clearSession, getSession } from "./api";
import Layout from "./components/Layout";
import AdminDashboard from "./pages/AdminDashboard";
import AIFlagReview from "./pages/AIFlagReview";
import AddressAudit from "./pages/AddressAudit";
import AuthPage from "./pages/AuthPage";
import CitizenDashboard from "./pages/CitizenDashboard";
import CitizenProfile from "./pages/CitizenProfile";
import PlaceholderPage from "./pages/PlaceholderPage";
import VerifiedVoters from "./pages/VerifiedVoters";
import VoterDatabase from "./pages/VoterDatabase";

function ProtectedRoute({ role }) {
  const session = getSession();

  if (!session?.role) {
    return <Navigate to="/" replace />;
  }

  if (role && session.role !== role) {
    const destination = session.role === "admin" ? "/admin/dashboard" : "/citizen/dashboard";
    return <Navigate to={destination} replace />;
  }

  return <Outlet />;
}

function PortalLayout({ role, navItems, title, subtitle }) {
  return (
    <Layout
      role={role}
      title={title}
      subtitle={subtitle}
      navItems={navItems}
      onLogout={clearSession}
    >
      <Outlet />
    </Layout>
  );
}

const adminNav = [
  { label: "Dashboard", to: "/admin/dashboard" },
  { label: "Voter Database", to: "/admin/voters" },
  { label: "AI Flag Review", to: "/admin/flags" },
  { label: "Address Audit", to: "/admin/address-audit" },
  { label: "Clean Verified", to: "/admin/verified-voters" },
];

const citizenNav = [
  { label: "Dashboard", to: "/citizen/dashboard" },
  { label: "My Profile", to: "/citizen/profile" },
  { label: "Birth Certificate", to: "/citizen/birth-certificate" },
  { label: "Death Certificate", to: "/citizen/death-certificate" },
  { label: "Application History", to: "/citizen/history" },
];

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AuthPage />} />

      <Route element={<ProtectedRoute role="admin" />}>
        <Route
          path="/admin"
          element={
            <PortalLayout
              role="admin"
              navItems={adminNav}
              title="JanMitra"
              subtitle="Election Officer Portal"
            />
          }
        >
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="voters" element={<VoterDatabase />} />
          <Route path="flags" element={<AIFlagReview />} />
          <Route path="address-audit" element={<AddressAudit />} />
          <Route path="verified-voters" element={<VerifiedVoters />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute role="voter" />}>
        <Route
          path="/citizen"
          element={
            <PortalLayout
              role="citizen"
              navItems={citizenNav}
              title="JanMitra Citizen Services"
              subtitle=""
            />
          }
        >
          <Route path="dashboard" element={<CitizenDashboard />} />
          <Route path="profile" element={<CitizenProfile />} />
          <Route path="birth-certificate" element={<PlaceholderPage title="Birth Certificate" />} />
          <Route path="death-certificate" element={<PlaceholderPage title="Death Certificate" />} />
          <Route path="history" element={<PlaceholderPage title="Application History" />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

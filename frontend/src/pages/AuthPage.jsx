import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, saveSession } from "../api";
import janmitraLogo from "../assets/janmitra-logo.png";

const initialLoginForm = { username: "", password: "" };
const initialAccountForm = { username: "", password: "" };
const initialProfileForm = {
  Name: "",
  Age: "",
  DOB: "",
  Gender: "",
  City: "",
  State: "",
  Address: "",
  Aadhar: "",
};

export default function AuthPage() {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState(null);
  const [citizenStep, setCitizenStep] = useState("login");
  const [loginForm, setLoginForm] = useState(initialLoginForm);
  const [accountForm, setAccountForm] = useState(initialAccountForm);
  const [profileForm, setProfileForm] = useState(initialProfileForm);
  const [status, setStatus] = useState({ error: "", success: "", loading: false });

  const heading = useMemo(() => {
    if (!selectedRole) {
      return {
        title: "Select Your Role",
        subtitle: "Government of India - AI-Assisted System",
      };
    }

    if (selectedRole === "admin") {
      return {
        title: "Election Officer Login",
        subtitle: "Enter username and password to continue.",
      };
    }

    if (citizenStep === "login") {
      return {
        title: "Citizen Login",
        subtitle: "Login if you are already registered.",
      };
    }

    if (citizenStep === "account") {
      return {
        title: "Create Citizen Account",
        subtitle: "Create username and password first.",
      };
    }

    return {
      title: "Complete Voter Registration",
      subtitle: "Fill your voter details to save them in the database.",
    };
  }, [citizenStep, selectedRole]);

  const resetStatus = () => setStatus({ error: "", success: "", loading: false });

  const handleLogin = async (event) => {
    event.preventDefault();
    setStatus({ error: "", success: "", loading: true });

    try {
      const response = await api.post("/api/login", {
        username: loginForm.username,
        password: loginForm.password,
        role: selectedRole === "admin" ? "admin" : "voter",
      });

      saveSession(response.data);
      navigate(response.data.role === "admin" ? "/admin/dashboard" : "/citizen/dashboard");
    } catch (error) {
      setStatus({
        error: error.response?.data?.message || "Login failed",
        success: "",
        loading: false,
      });
      return;
    }

    setStatus({ error: "", success: "", loading: false });
  };

  const handleCreateAccount = async (event) => {
    event.preventDefault();
    setStatus({ error: "", success: "", loading: true });

    try {
      const response = await api.post("/api/check-username", {
        username: accountForm.username,
      });
      setStatus({
        error: "",
        success: `${response.data.message}. Now fill the voter details.`,
        loading: false,
      });
      setCitizenStep("profile");
    } catch (error) {
      setStatus({
        error: error.response?.data?.message || "Account creation failed",
        success: "",
        loading: false,
      });
    }
  };

  const handleCompleteRegistration = async (event) => {
    event.preventDefault();
    setStatus({ error: "", success: "", loading: true });

    try {
      const response = await api.post("/api/register-voter", {
        ...profileForm,
        username: accountForm.username,
        password: accountForm.password,
      });

      setLoginForm({
        username: accountForm.username,
        password: accountForm.password,
      });
      setStatus({
        error: "",
        success: `${response.data.message}${response.data.voter_id ? ` Your voter ID is ${response.data.voter_id}.` : ""}`,
        loading: false,
      });
      setCitizenStep("login");
      setProfileForm(initialProfileForm);
    } catch (error) {
      setStatus({
        error: error.response?.data?.message || "Registration failed",
        success: "",
        loading: false,
      });
    }
  };

  const goBackToRoleSelection = () => {
    setSelectedRole(null);
    setCitizenStep("login");
    resetStatus();
  };

  return (
    <div className="auth-simple-page">
      <div className="auth-simple-shell">
        <img className="auth-brand-logo" src={janmitraLogo} alt="JanMitra System logo" />
        <h1>Electoral Data Verification</h1>
        <p className="auth-subtitle">{heading.subtitle}</p>

        <div className="auth-card">
          <h2>{heading.title}</h2>

          {status.error && <div className="message error">{status.error}</div>}
          {status.success && <div className="message success">{status.success}</div>}

          {!selectedRole && (
            <div className="auth-actions-column">
              <button className="primary-button full-button" onClick={() => setSelectedRole("citizen")}>
                Citizen Login
              </button>
              <button className="outline-button full-button" onClick={() => setSelectedRole("admin")}>
                Election Officer Login
              </button>
            </div>
          )}

          {selectedRole === "admin" && (
            <form className="grid-form" onSubmit={handleLogin}>
              <label>
                Username
                <input
                  value={loginForm.username}
                  onChange={(event) => setLoginForm((current) => ({ ...current, username: event.target.value }))}
                  required
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
                  required
                />
              </label>
              <button className="primary-button full-button" type="submit" disabled={status.loading}>
                {status.loading ? "Please wait..." : "Login"}
              </button>
              <button className="text-button" type="button" onClick={goBackToRoleSelection}>
                Back to role selection
              </button>
            </form>
          )}

          {selectedRole === "citizen" && citizenStep === "login" && (
            <form className="grid-form" onSubmit={handleLogin}>
              <label>
                Username
                <input
                  value={loginForm.username}
                  onChange={(event) => setLoginForm((current) => ({ ...current, username: event.target.value }))}
                  required
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
                  required
                />
              </label>
              <button className="primary-button full-button" type="submit" disabled={status.loading}>
                {status.loading ? "Please wait..." : "Login"}
              </button>
              <button
                className="outline-button full-button"
                type="button"
                onClick={() => {
                  setCitizenStep("account");
                  resetStatus();
                }}
              >
                Create Register
              </button>
              <button className="text-button" type="button" onClick={goBackToRoleSelection}>
                Back to role selection
              </button>
            </form>
          )}

          {selectedRole === "citizen" && citizenStep === "account" && (
            <form className="grid-form" onSubmit={handleCreateAccount}>
              <label>
                Create Username
                <input
                  value={accountForm.username}
                  onChange={(event) => setAccountForm((current) => ({ ...current, username: event.target.value }))}
                  required
                />
              </label>
              <label>
                Create Password
                <input
                  type="password"
                  value={accountForm.password}
                  onChange={(event) => setAccountForm((current) => ({ ...current, password: event.target.value }))}
                  required
                />
              </label>
              <button className="primary-button full-button" type="submit" disabled={status.loading}>
                {status.loading ? "Creating account..." : "Continue"}
              </button>
              <button
                className="text-button"
                type="button"
                onClick={() => {
                  setCitizenStep("login");
                  resetStatus();
                }}
              >
                Back to citizen login
              </button>
            </form>
          )}

          {selectedRole === "citizen" && citizenStep === "profile" && (
            <form className="grid-form" onSubmit={handleCompleteRegistration}>
              {Object.entries(profileForm).map(([key, value]) => (
                <label key={key}>
                  {key}
                  {key === "Gender" ? (
                    <select
                      value={value}
                      onChange={(event) => setProfileForm((current) => ({ ...current, [key]: event.target.value }))}
                      required
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  ) : key === "DOB" ? (
                    <input
                      type="date"
                      value={value}
                      onChange={(event) => setProfileForm((current) => ({ ...current, [key]: event.target.value }))}
                      required
                    />
                  ) : key === "Address" ? (
                    <textarea
                      rows="4"
                      value={value}
                      onChange={(event) => setProfileForm((current) => ({ ...current, [key]: event.target.value }))}
                      required
                    />
                  ) : (
                    <input
                      type={key === "Age" ? "number" : "text"}
                      value={value}
                      onChange={(event) => setProfileForm((current) => ({ ...current, [key]: event.target.value }))}
                      required
                    />
                  )}
                </label>
              ))}
              <button className="primary-button full-button" type="submit" disabled={status.loading}>
                {status.loading ? "Registering..." : "Register"}
              </button>
            </form>
          )}
        </div>

        <p className="auth-footnote">This is a demonstration system. No real data is processed.</p>
      </div>
    </div>
  );
}

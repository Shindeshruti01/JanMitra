import { useNavigate } from "react-router-dom";

function RoleSelect() {
  const navigate = useNavigate();

  const handleRoleSelect = (role) => {
    navigate(`/login/${role}`);
  };

  return (
    <div style={{ textAlign: "center", marginTop: "100px" }}>
      <h1>Electoral Data Verification</h1>
      <p>Government of India — AI-Assisted System</p>
      <h2>Select Your Role</h2>

      <button
        onClick={() => handleRoleSelect("voter")}
        style={{
          padding: "12px 24px",
          margin: "10px",
          backgroundColor: "#1e2a78",
          color: "white",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
        }}
      >
        Citizen Login
      </button>

      <button
        onClick={() => handleRoleSelect("admin")}
        style={{
          padding: "12px 24px",
          margin: "10px",
          backgroundColor: "white",
          color: "#1e2a78",
          border: "1px solid #1e2a78",
          borderRadius: "5px",
          cursor: "pointer",
        }}
      >
        Election Officer Login
      </button>
    </div>
  );
}

export default RoleSelect;
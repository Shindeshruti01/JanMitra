import { useEffect, useState } from "react";
import { api, formatDate, getSession, maskAadhar } from "../api";
import StatCard from "../components/StatCard";

export default function CitizenDashboard() {
  const session = getSession();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      try {
        const response = await api.get(`/api/profile/${session?.username}`);
        setProfile(response.data);
      } catch (loadError) {
        setError(loadError.response?.data?.message || "Unable to fetch citizen profile.");
      } finally {
        setLoading(false);
      }
    }

    if (session?.username) {
      loadProfile();
    } else {
      setLoading(false);
      setError("No active citizen session found.");
    }
  }, [session?.username]);

  if (loading) {
    return <div className="empty-state">Loading citizen dashboard...</div>;
  }

  if (error) {
    return <div className="message error">{error}</div>;
  }

  return (
    <div className="page-stack">
      {profile.reviewMessage ? <div className="message success">{profile.reviewMessage}</div> : null}

      <section className="hero-banner">
        <div>
          <p className="eyebrow">Citizen dashboard</p>
          <h2>Welcome back, {profile.name || profile.username}</h2>
          <p>
            Voter ID: <strong>{profile.voterId || "Not linked yet"}</strong>
          </p>
        </div>
      </section>

      <section className="stats-grid">
        <StatCard label="Registration status" value={profile.status} tone="success" />
        <StatCard label="City" value={profile.city || "NA"} />
        <StatCard label="State" value={profile.state || "NA"} />
      </section>

      <section className="card-grid two-up">
        <article className="card">
          <div className="card-header">
            <h3>Identity summary</h3>
          </div>
          <div className="detail-grid">
            <div><span>Name</span><strong>{profile.name || "Not available"}</strong></div>
            <div><span>Date of birth</span><strong>{formatDate(profile.dob)}</strong></div>
            <div><span>Gender</span><strong>{profile.gender || "Not available"}</strong></div>
            <div><span>Aadhaar</span><strong>{maskAadhar(profile.aadhar)}</strong></div>
          </div>
        </article>

        <article className="card">
          <div className="card-header">
            <h3>Address summary</h3>
          </div>
          <div className="detail-grid">
            <div><span>City</span><strong>{profile.city || "Not available"}</strong></div>
            <div><span>State</span><strong>{profile.state || "Not available"}</strong></div>
            <div className="full"><span>Address</span><strong>{profile.address || "Not available"}</strong></div>
          </div>
        </article>
      </section>
    </div>
  );
}

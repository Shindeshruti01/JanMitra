import { useEffect, useState } from "react";
import { api, formatDate, getSession, maskAadhar } from "../api";

export default function CitizenProfile() {
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
        setError(loadError.response?.data?.message || "Unable to fetch profile.");
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
    return <div className="empty-state">Loading profile...</div>;
  }

  if (error) {
    return <div className="message error">{error}</div>;
  }

  return (
    <section className="card">
      <div className="card-header">
        <h2>Citizen Profile</h2>
      </div>
      {profile.reviewMessage ? <div className="message success">{profile.reviewMessage}</div> : null}
      <div className="detail-grid">
        <div><span>Username</span><strong>{profile.username}</strong></div>
        <div><span>Voter ID</span><strong>{profile.voterId || "Not linked"}</strong></div>
        <div><span>Full name</span><strong>{profile.name || "Not available"}</strong></div>
        <div><span>Age</span><strong>{profile.age || "Not available"}</strong></div>
        <div><span>Date of birth</span><strong>{formatDate(profile.dob)}</strong></div>
        <div><span>Gender</span><strong>{profile.gender || "Not available"}</strong></div>
        <div><span>City</span><strong>{profile.city || "Not available"}</strong></div>
        <div><span>State</span><strong>{profile.state || "Not available"}</strong></div>
        <div><span>Aadhaar</span><strong>{maskAadhar(profile.aadhar)}</strong></div>
        <div><span>Status</span><strong>{profile.status}</strong></div>
        <div className="full"><span>Address</span><strong>{profile.address || "Not available"}</strong></div>
      </div>
    </section>
  );
}
